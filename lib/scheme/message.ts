import { Schema } from "mongoose";

import { getOrCreateModel } from "./model";

export const messageSchema = new Schema(
  {
    conversationId: { type: String, required: true, index: true },
    senderId: { type: String, required: true, index: true },
    receiverId: { type: String, required: true, index: true },
    content: { type: String, required: true, maxlength: 2000 },
    read: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now, index: true },
  },
  { collection: "messages", timestamps: false, versionKey: false }
);

export const Message = getOrCreateModel<any>("Message", messageSchema);

export default Message;
