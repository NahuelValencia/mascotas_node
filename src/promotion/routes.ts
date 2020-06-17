"use strict";

import * as express from "express";
import * as error from "../server/error";
import * as imageService from "../image/service";
import { onlyLoggedIn } from "../token/passport";
import * as user from "../user/service";
import { ISessionRequest } from "../user/service";
import * as service from "./service";

/**
 * Modulo de publicidad
 */
export function initModule(app: express.Express) {
  // Rutas del controlador
  app.route("/v1/promotion")
    .get(onlyLoggedIn, list)
    .post(onlyLoggedIn, create);

  app.route("/v1/promotion/:promotionId")
    .get(read)
    .delete(onlyLoggedIn, remove);

  app
    .route("/v1/promotion/picture")
    .post(onlyLoggedIn, updatePromotionPicture);
}

/**
 * @api {get} /v1/promotion Recupera las publicidades
 * @apiName Listar Publicidades
 * @apiGroup Publicidades
 *
 * @apiDescription Retorna una lista de todas las publicidades disponibles.
 *
 * @apiSuccessExample {json} Publicidad
 *   [ {
 *      "title": "Dia del Padre",
 *      "description": "Comprale a tu papa lo que siempre ha querido!"
 *      "id": "",
 *      "redirectLink": ""
 *     }, ...
 *   ]
 *
 * @apiUse 200OK
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
async function list(req: ISessionRequest, res: express.Response) {
  const result = await service.list();

  res.json(result.map(item => {
    return {
      id: item.id,
      title: item.title,
      description: item.description,
      redirectLink: item.redirectLink,
      imageId: item.imageId
    };
  }));
}

/**
 * @api {post} /v1/promotion Crear una publicidad
 * @apiName Crear Publicidad
 * @apiGroup Publicidades
 *
 * @apiDescription Crea o actualiza una publicidad.
 *
 * @apiExample {json} Publicidad
 *    {
 *      "title": "Nombre de la publicidad",
 *      "description": "Breve descripcion de la publicidad",
 *      "redirectLink": "url a la pagina donde se puede ver la publicidad completa",
 *      "enabled": [true|false]
 *    }
 *
 * @apiSuccessExample {json} Publicidad
 *    {
 *      "title": "Dia del Padre",
 *      "description": "Comprale a tu papa lo que siempre ha querido!"
 *      "redirectLink": "",
 *      "id": "",
 *      "enabled": [true]
 *    }
 *
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
async function create(req: ISessionRequest, res: express.Response) {
  console.log("request body");
  console.log(req.body);
  await user.hasPermission(req.user.user_id, "admin");
  const result = await service.create(req.body);
  console.log("result");
  console.log(result);
  res.json({ id: result });
}

/**
 * @api {post} /v1/promotion/:promotionId Buscar una publicidad
 * @apiName Buscar Publicidad
 * @apiGroup Publicidades
 *
 * @apiDescription Buscar una publicidad por ID.
 *
 * @apiSuccessExample {json} Publicidad
 *    {
 *      "title": "Dia del Padre",
 *      "description": "Comprale a tu papa lo que siempre ha querido!"
 *      "redirectLink": "",
 *      "id": "",
 *    }
 *
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
async function read(req: ISessionRequest, res: express.Response) {
  const result = await service.read(req.params.promotionId);
  return res.json({
    id: result.id,
    title: result.title,
    description: result.description,
    redirectLink: result.redirectLink,
    imageId: result.imageId
  });
}

/**
 * @api {delete} /v1/promotion/:promotionId Eliminar una publicidad
 * @apiName Eliminar Publicidad
 * @apiGroup Publicidades
 *
 * @apiDescription Elimina una publicidad por ID.
 *
 * @apiUse 200OK
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
async function remove(req: ISessionRequest, res: express.Response) {
  await user.hasPermission(req.user.user_id, "admin");
  await service.invalidate(req.params.promotionId);
  res.send();
}

/**
 * @api {post} /v1/promotion/picture Guardar Imagen de la publicidad
 * @apiName Guardar Imagen de Publicidad
 * @apiGroup Publicidades
 *
 * @apiDescription Guarda una imagen del Banner de publicidad en redis y el id en mongo.
 *
 * @apiExample {json} Body
 *    {
 *      "image" : "Base 64 Image Text"
 *    }
 *
 * @apiSuccessExample {json} Response
 *    {
 *      "id": "id de imagen"
 *    }
 *
 * @apiUse AuthHeader
 * @apiUse ParamValidationErrors
 * @apiUse OtherErrors
 */
async function updatePromotionPicture(req: ISessionRequest, res: express.Response) {
  const imageResult = await imageService.create(req.body);
  console.log("imageResult id");
  console.log(imageResult.id);

  await validateUpdatePromotionPicture(imageResult.id);

  res.json({
    id: imageResult.id
  });
}

async function validateUpdatePromotionPicture(imageId: string): Promise<void> {
  const result: error.ValidationErrorMessage = {
    messages: []
  };

  if (!imageId || imageId.length <= 0) {
    result.messages.push({ path: "image", message: "Imagen inválida." });
  }

  if (result.messages.length > 0) {
    return Promise.reject(result);
  }

  return Promise.resolve();
}
