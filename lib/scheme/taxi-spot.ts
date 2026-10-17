import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const taxiSpotSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    area: { type: String, required: true, trim: true, maxlength: 100 },
    directions: { type: String, default: "", maxlength: 500 },
    routes: { type: String, default: "", maxlength: 300 },
    image: { type: String, default: "" },
    videoUrl: { type: String, default: "", maxlength: 2048 },
    createdBy: { type: String, required: true, index: true },
    createdByName: { type: String, default: "Netizen member" },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "taxiSpots", timestamps: false, versionKey: false }
);

export const TaxiSpot = getOrCreateModel<any>("TaxiSpot", taxiSpotSchema);

export default TaxiSpot;
