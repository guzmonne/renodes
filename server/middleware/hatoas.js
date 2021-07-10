"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.collection = exports.model = exports.collectionLinks = exports.modelLinks = void 0;
/**
 * LINKS stores functions to create valid `ResponseItemValues`.
 */
const LINKS = {
    read: (resource, rel, id) => ({ href: `/api/${resource}/${id}`, rel, type: "GET" }),
    update: (resource, rel, id) => ({ href: `/api/${resource}/${id}`, rel, type: "PUT" }),
    delete: (resource, rel, id) => ({ href: `/api/${resource}/${id}`, rel, type: "DELETE" }),
    query: (resource, rel) => ({ href: `/api/${resource}`, rel, type: "GET" }),
    create: (resource, rel) => ({ href: `/api/${resource}`, rel, type: "POST" }),
};
/**
 * modelLinks returns the `links` that should be added to a model.
 * @param id - Model unique identifier.
 * @param resource - Model resource name.
 * @param rel - Model link relationship.
 */
function modelLinks(id, resource, rel) {
    return {
        self: LINKS.read(resource, rel, id),
        update: LINKS.update(resource, rel, id),
        delete: LINKS.delete(resource, rel, id),
    };
}
exports.modelLinks = modelLinks;
/**
 * collection returns the `links` that should be added to a collection.
 * @param resource - Model resource name.
 * @param rel - Model link relationship.
 */
function collectionLinks(resource, rel) {
    return {
        query: LINKS.query(resource, rel),
        create: LINKS.create(resource, rel),
    };
}
exports.collectionLinks = collectionLinks;
/**
 * model is a middleware that decorates a `json` object containing
 * an `item` with its corresponding `links`.
 * @param req - Architect request object.
 */
const model = (req) => {
    const { resource, rel } = req;
    const { item } = req.json;
    req.json = {
        item: Object.assign(Object.assign({}, item), { _links: modelLinks(item.id, resource, rel) }),
    };
};
exports.model = model;
/**
 * collection is a middleware that decorates a `json` object containing
 * an `items` with its corresponding `links`.
 * @param req - Architect request object.
 */
const collection = (req) => {
    const { resource, rel } = req;
    const { items } = req.json;
    req.json = {
        items: items.map((item) => (Object.assign(Object.assign({}, item), { _links: modelLinks(item.id, resource, rel) }))),
        _links: collectionLinks(resource, rel),
    };
};
exports.collection = collection;
//# sourceMappingURL=hatoas.js.map