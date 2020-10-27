/*
 * Copyright (c) 2020 the original author or authors
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      https://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

import { Injectable } from '@angular/core';
import { Actions, Effect, ofType } from '@ngrx/effects';
import { iif, Observable, of } from 'rxjs';
import { catchError, map, mergeMap, switchMap, tap } from 'rxjs/operators';
import { SnackBarService } from 'src/app/features/snackbar/snackbar.service';
import { FaceRecognitionService } from '../../core/face-recognition/face-recognition.service';
import { recognizeFace, recognizeFaceSuccess, recognizeFaceFail,
  addFaceFail, addFace, addFaceSuccess } from './actions';
import { Action, Store } from '@ngrx/store';
import { selectCurrentModel, selectCurrentModelId } from '../model/selectors';
import { selectDemoApiKey } from '../demo/selectors';

@Injectable()
export class FaceRecognitionEffects {
  constructor(
    private actions: Actions,
    private store: Store<any>,
    private recognitionService: FaceRecognitionService,
    private snackBarService: SnackBarService
  ) { }

  @Effect()
  recognizeFace$ = this.actions.pipe(
    ofType(recognizeFace),
    switchMap((action) => this.store.select(selectCurrentModelId).pipe(
        mergeMap((data) =>
          iif(
            () => !!data,
            this.store.select(selectCurrentModel).pipe(
              switchMap((model) => this.recognizeFaceAction(action.file, model.apiKey))
            ),
            this.store.select(selectDemoApiKey).pipe(
              switchMap((apiKey) => this.recognizeFaceAction(action.file, apiKey))
            )
          )
        )
      )
    )
  );

  @Effect()
  addFace$ = this.actions.pipe(
    ofType(addFace),
    switchMap(action => this.recognitionService.addFace(action.file, action.model).pipe(
      map(model => addFaceSuccess({ model })),
      catchError(error => of(addFaceFail({ error }))),
    )),
  );

  @Effect({ dispatch: false })
  showError$ = this.actions.pipe(
    ofType(recognizeFaceFail, addFaceFail),
    tap(action => {
      this.snackBarService.openHttpError(action.error);
    })
  );

  /**
   * Method made to finish recognize face effect, and for better understanding (more readable code).
   *
   * @param file Image
   * @param apiKey model api key
   */
  private recognizeFaceAction(file, apiKey): Observable<Action> {
    return this.recognitionService.recognize(file, apiKey).pipe(
      map(({data, request}) => recognizeFaceSuccess({
        model: data,
        file,
        request
      })),
      catchError(error => of(recognizeFaceFail({ error })))
    );
  }
}
