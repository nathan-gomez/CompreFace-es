import { Injectable } from '@angular/core';
import { IFacade } from 'src/app/core/facade/IFacade';
import { AppUser } from 'src/app/data/appUser';
import { AppState } from 'src/app/store';
import { Observable, Subscription, combineLatest } from 'rxjs';
import { Store } from '@ngrx/store';
import { getSelectedOrganizationId } from 'src/app/store/organization/selectors';
import { selectUsers, selectIsPendingUserStore } from 'src/app/store/user/selectors';
import { selectAllRoles, selectIsPendingRoleStore } from 'src/app/store/role/selectors';
import { selectUserRollForSelectedOrganization } from 'src/app/store/organization/selectors';
import { map, tap } from 'rxjs/operators';
import { LoadUsersEntityAction, PutUpdatedUserRoleEntityAction, InviteUser } from 'src/app/store/user/action';
import { LoadRolesEntityAction } from 'src/app/store/role/actions';
import { UserService } from 'src/app/core/user/user.service';

@Injectable()
export class UserListFacade implements IFacade {
  public selectedOrganization$: Observable<string>;
  public users$: Observable<AppUser[]>;
  public availableRoles$: Observable<string[]>;
  public isLoading$: Observable<boolean>;

  private selectedOrganization: string;

  private selectedOrganizationSubscription: Subscription;

  constructor(private store: Store<AppState>, private userService: UserService) {
    this.selectedOrganization$ = store.select(getSelectedOrganizationId);
    this.users$ = store.select(selectUsers);

    const allRoles$ = store.select(selectAllRoles);
    const userRoleInSelectedOrganization$ = store.select(selectUserRollForSelectedOrganization);

    this.availableRoles$ = combineLatest(
      allRoles$,
      userRoleInSelectedOrganization$
    )
      .pipe(
        map(
          (observResult) => {
            let res = [];
            const [allRoles, userRole] = observResult;
            const roleIndex = allRoles.indexOf(userRole);

            if (~roleIndex) {
              res = allRoles.slice(roleIndex);
            }

            return res;
          }
        )
      );

    const usersLoading$ = store.select(selectIsPendingUserStore);
    const roleLoading$ = store.select(selectIsPendingRoleStore);

    this.isLoading$ = combineLatest(usersLoading$, roleLoading$)
          .pipe(map(observResults => !(!observResults[0] && !observResults[1])));
  }

  public initSubscriptions(): void {
    this.selectedOrganizationSubscription = this.selectedOrganization$.subscribe(
      orgId => {
        if (orgId) {
          this.selectedOrganization = orgId;
          this.loadUsers();
          this.loadAvailableRoles();
        }
      }
    );
  }

  public loadUsers(): void {
    this.store.dispatch(LoadUsersEntityAction({
      organizationId: this.selectedOrganization
    }));
  }

  public updateUserRole(id: string, accessLevel: string): void {
    this.store.dispatch(PutUpdatedUserRoleEntityAction({
      organizationId: this.selectedOrganization,
      user: {
        id,
        accessLevel
      }
    }));
  }

  public inviteUser(userEmail: string): Observable<any> {
    return this.userService.inviteUser(this.selectedOrganization, 'USER', userEmail)
      .pipe(tap(() => this.loadUsers()));
  }

  public loadAvailableRoles(): void {
    this.store.dispatch(LoadRolesEntityAction());
  }

  public unsubscribe(): void {
    this.selectedOrganizationSubscription.unsubscribe();
  }
}
