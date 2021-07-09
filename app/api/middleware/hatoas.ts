import type { ResponseLinks, ResponseItemValue } from "../types"

interface HateoasLinks {
  [key: string]: (...args: any[]) => ResponseItemValue
}
/**
 * LINKS stores functions to create valid `ResponseItemValues`.
 */
const LINKS: HateoasLinks = {
  read:   (resource: string, rel: string, id: string) => ({href: `/api/${resource}/${id}`, rel, type: "GET"}),
  update: (resource: string, rel: string, id: string) => ({href: `/api/${resource}/${id}`, rel, type: "PUT"}),
  delete: (resource: string, rel: string, id: string) => ({href: `/api/${resource}/${id}`, rel, type: "DELETE"}),
  query:  (resource: string, rel: string) => ({href: `/api/${resource}`, rel, type: "GET"}),
  create: (resource: string, rel: string) => ({href: `/api/${resource}`, rel, type: "POST"}),
}
/**
 * modelLinks returns the `links` that should be added to a model.
 * @param id - Model unique identifier.
 * @param resource - Model resource name.
 * @param rel - Model link relationship.
 */
export function modelLinks(id: string, resource: string, rel: string): ResponseLinks {
  return {
    self:   LINKS.read(resource, rel, id),
    update: LINKS.update(resource, rel, id),
    delete: LINKS.delete(resource, rel, id),
  }
}
/**
 * collection returns the `links` that should be added to a collection.
 * @param resource - Model resource name.
 * @param rel - Model link relationship.
 */
export function collectionLinks(resource: string, rel: string): ResponseLinks {
  return {
    query:  LINKS.query(resource, rel),
    create: LINKS.create(resource, rel),
  }
}
/**
 * model is a middleware that decorates a `json` object containing
 * an `item` with its corresponding `links`.
 * @param req - Architect request object.
 */
export const model = async (req: any): Promise<undefined> => {
  const {resource, rel} = req
  const {item} = req.json
  req.json = {
    item: {...item, _links: modelLinks(item.id, resource, rel)},
    _links: collectionLinks(resource, rel),
  }
  return Promise.resolve(undefined)
}
/**
 * collection is a middleware that decorates a `json` object containing
 * an `items` with its corresponding `links`.
 * @param req - Architect request object.
 */
export const collection = async (req: any): Promise<undefined> => {
  const {resource, rel} = req
  const {items} = req.json
  req.json = {
    items: items.map((item: any) => ({...item, _links: modelLinks(item.id, resource, rel)})),
    _links: collectionLinks(resource, rel),
  }
  return Promise.resolve(undefined)
}