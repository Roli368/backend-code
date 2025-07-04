import mongoose, { Schema } from "mongoose";
const likeSchema = new Schema({
    // either of `video`,`comment` or `tweet` will be assigned other are null
    video:{
        type:Schema.Types.ObjectId,
        ref:"video",

    },
    comment:{
        type:Schema.Types.ObjectId,
        ref:"comment",
    },
    tweet:{
       type:Schema.Types.ObjectId, 
       ref:"Tweet",
        
    },
    likedBy:{
        type:Schema.Types.ObjectId, 
        ref:"User",
    },

},
{timestamps:true}
);

 export const Like = mongoose.model("Like",likeSchema) ;