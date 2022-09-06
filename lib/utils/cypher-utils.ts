import { DtoConstructor, plainToDto } from './plain-to-dto';
import {
  Node,
  Relationship,
  Record,
  isNode,
  isRelationship,
} from 'neo4j-driver-core';

export function map<T>(
  record: Record,
  key: string,
  dtoConstructor?: DtoConstructor<T>,
) {
  const entry = record.get(key);
  if (isNode(entry)) {
    return plainToDto<T>(extractNode(entry as Node), dtoConstructor);
  } else if (isRelationship(entry)) {
    return plainToDto<T>(extractRel(entry as Relationship), dtoConstructor);
  }

  return plainToDto<T>(entry, dtoConstructor);
}

export function mapArray<T>(
  record: Record,
  key: string,
  dtoConstructor?: DtoConstructor<T[]>,
) {
  const entry = record.get(key) as object[];
  if (isNode(entry[0])) {
    const nodes = entry as Node[];
    return plainToDto<T[]>(nodes.map(extractNode), dtoConstructor);
  } else if (isRelationship(entry[0])) {
    const nodes = entry as Relationship[];
    return plainToDto<T[]>(nodes.map(extractRel), dtoConstructor);
  }

  return plainToDto<T[]>(entry, dtoConstructor);
}

function extractNode(node: Node) {
  return {
    ...node.properties,
    id: node.identity,
    labels: node.labels,
  };
}

function extractRel(rel: Relationship) {
  return {
    ...rel.properties,
    id: rel.identity,
  };
}
