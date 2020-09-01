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

package com.exadel.frs.core.trainservice.component.migration;

import static java.util.stream.Collectors.toList;
import com.exadel.frs.core.trainservice.component.FaceClassifierLockManager;
import com.exadel.frs.core.trainservice.component.FaceClassifierManager;
import com.exadel.frs.core.trainservice.dao.TrainedModelDao;
import com.exadel.frs.core.trainservice.entity.Face;
import com.exadel.frs.core.trainservice.entity.Face.Embedding;
import com.exadel.frs.core.trainservice.repository.FacesRepository;
import com.exadel.frs.core.trainservice.system.feign.FeignClientFactory;
import com.exadel.frs.core.trainservice.system.feign.python.FacesClient;
import com.exadel.frs.core.trainservice.util.MultipartFileData;
import feign.FeignException;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MigrationComponent {

    private final FeignClientFactory feignClientFactory;
    private final FaceClassifierLockManager lockManager;
    private final FaceClassifierManager faceManager;
    private final MigrationStatusStorage migrationStatusStorage;
    private final FacesRepository facesRepository;
    private final TrainedModelDao trainedModelDao;

    @SneakyThrows
    @Async
    public void migrate(String url) {
        log.info("Waiting till current models finish training");
        waitUntilModelsFinishTraining();
        log.info("Models finished training");

        try {
            log.info("Migrating...");
            processFaces(url);
            log.info("Calculating embedding for faces finished");

            log.info("Retraining models");
            processModels();
            log.info("Retraining models finished");

            log.info("Migration successfully finished");
        } catch (Exception e) {
            log.info("Migration finished with exception");
            throw e;
        } finally {
            migrationStatusStorage.finishMigration();
        }
    }

    private void processModels() {
        val models = trainedModelDao.findAllWithoutClassifier();
        for (val model : models) {
            log.info("Retraining model {}", model.getId());
            val faces = facesRepository.findByApiKey(model.getModelKey());
            if (faces == null || faces.isEmpty()) {
                faceManager.initNewClassifier(model.getModelKey());
            } else {
                faceManager.initNewClassifier(
                        model.getModelKey(),
                        faces.stream()
                             .map(Face::getId)
                             .collect(toList())
                );
            }
        }
    }

    private void processFaces(String url) {
        val migrationServerFeignClient = feignClientFactory.getFeignClient(FacesClient.class, url);

        val migrationCalculatorVersion = migrationServerFeignClient.getStatus().getCalculatorVersion();

        log.info("Calculating embedding for faces");
        val all = facesRepository.findAll();
        for (val face : all) {
            log.info("Processing facename {} with id {}", face.getFaceName(), face.getId());
            if (!migrationCalculatorVersion.equals(face.getEmbedding().getCalculatorVersion())) {
                val file = new MultipartFileData(face.getRawImg(), face.getFaceName(), null);

                try {
                    val scanResponse = migrationServerFeignClient.scanFaces(file, 1, null);

                    val embeddings = scanResponse.getResult().stream()
                                                 .findFirst().orElseThrow()
                                                 .getEmbedding();
                    face.setEmbedding(new Embedding(embeddings, scanResponse.getCalculatorVersion()));
                    facesRepository.save(face);
                } catch (FeignException.InternalServerError | FeignException.BadRequest error) {
                    log.error("{} during processing facename {} with id {}", error.toString(), face.getFaceName(), face.getId());
                    face.setEmbedding(new Embedding());
                    facesRepository.save(face);
                }
            }
        }
    }

    private void waitUntilModelsFinishTraining() {
        try {
            lockManager.getCountDownLatch().await();
        } catch (InterruptedException e) {
            throw new RuntimeException();
        }
    }
}
