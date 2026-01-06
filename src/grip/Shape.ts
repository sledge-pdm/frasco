import { Layer } from '../layer';
import { GripPoint } from './types';

export abstract class GripShape {
  abstract readonly id: string;
  abstract start(layer: Layer, point: GripPoint): void;
  abstract addPoint(layer: Layer, point: GripPoint, prev: GripPoint): void;
  abstract end(layer: Layer, point: GripPoint, prev: GripPoint): void;
}
