
import mongoose, { Schema, type InferSchemaType } from 'mongoose';

const managedTreeSchema = new Schema(
  {
    treeName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 200,
    },
    wardNumber: {
      type: String,
      required: true,
      trim: true,
      maxlength: 50,
    },
    departmentCode: {
      type: String,
      trim: true,
      default: null,
    },
    kgisTreeId: {
      type: String,
      trim: true,
      default: null,
    },
    kgisCode: {
      type: String,
      trim: true,
      default: null,
    },
    latitude: {
      type: Number,
      required: true,
      min: -90,
      max: 90,
    },
    longitude: {
      type: Number,
      required: true,
      min: -180,
      max: 180,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 1000,
      default: '',
    },
  },
  { timestamps: true },
);

export type ManagedTreeDocument = InferSchemaType<typeof managedTreeSchema>;

export const ManagedTree =
  mongoose.models.ManagedTree ||
  mongoose.model('ManagedTree', managedTreeSchema);
