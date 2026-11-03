import { SchemaConstructor } from '@datacapy/schema'
import { SchemaTask } from '../schema/SchemaTask'

/**
 * Task Constructor
 * Represents a scheduled task definition with execution parameters.
 * Fields come from {@link SchemaTask}.
 */
export class Task extends SchemaConstructor.from(SchemaTask) {}
