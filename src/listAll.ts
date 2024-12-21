/* eslint-disable @typescript-eslint/no-explicit-any */
import { extract_fields_from_document } from './fields';
import type * as Firestore from './types';
import { get_firestore_endpoint } from './utils';

type ListOptions = {
  /**
   * The order to sort results by.
   */
  orderBy?: string;

  /**
   * When to take a snapshot of the documents.
   */
  readTime?: string;

  /**
   * A filter to apply to the documents.
   */
  showMissing?: boolean;
};

/**
 * Lists all documents in a collection.
 * Reference: {@link https://firebase.google.com/docs/firestore/reference/rest/v1/projects.databases.documents/list}
 *
 * @param firestore The DB instance.
 * @param collection_path The collection path.
 * @param options Optional parameters for the list operation.
 */
export const listAll = async <Fields extends Record<string, any>>(
  { jwt, project_id }: Firestore.DB,
  //...paths: string[],
  //collection_path: string,
  ...args: [...string[], ListOptions] | [...string[]]
) =>
  //options: ListOptions = {}
  {
    let paths: string[] = [];
    let options: ListOptions = {};
    if (typeof args.at(-1) === 'object') {
      paths = args.slice(0, -1) as string[];
      options = args.at(-1) as ListOptions;
    } else {
      paths = args as string[];
    }
    //const paths = args.slice(0, -1) as string[];
    //const options = args.at(-1) as ListOptions;
    const allDocuments: Firestore.CustomDocument<Fields>[] = [];
    let pageToken: string | undefined;

    do {
      const endpoint = get_firestore_endpoint(project_id, paths);

      // Add query parameters
      if (pageToken) endpoint.searchParams.set('pageToken', pageToken);
      if (options.orderBy) endpoint.searchParams.set('orderBy', options.orderBy);
      if (options.readTime) endpoint.searchParams.set('readTime', options.readTime);
      if (options.showMissing) endpoint.searchParams.set('showMissing', 'true');

      const response = await fetch(endpoint, {
        headers: {
          Authorization: `Bearer ${jwt}`,
        },
      });

      const data: Firestore.ListResponse = await response.json();

      if (data.error) throw new Error(data.error.message);

      // Add documents from current page to our collection
      if (data.documents) {
        const documents = data.documents.map((document: Firestore.Document) =>
          extract_fields_from_document<Fields>(document)
        );
        allDocuments.push(...documents);
      }

      // Update pageToken for next iteration
      pageToken = data.nextPageToken;
    } while (pageToken);

    return allDocuments;
  };
