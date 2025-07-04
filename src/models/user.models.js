
import mongoose, { Schema } from "mongoose";
import bcrypt from "bcrypt"
import jwt from "jsonwebtoken"
const userSchema = new Schema(
    {
        username:{
            type:String,
            required:true,
            unique:true,
            lowercase:true,
            trim:true,
            index:true

        },
        email:{
            type:String,
            lowercase:true,
            unique:true,
            trim:true,
        },
        fullname:{
            type:String,
            index:true,
            unique:true,
            trim:true,
        },
        avatar:{
             type:String, // cloudiary URL
            required:true,
        },
        coverImage:{ 
            type:String, // cloudiary URL
        },
        watchHistory:[
            {
                type:Schema.Types.ObjectId,
                ref:"Video"
            }
        ],
        password:{
            type:String
            ,required:[true,"password is required"]
        },
        refreshToken:{
            type: String
        }

    },
    {timestamps:true}
)

userSchema.pre("save",async function(next) {
    // fixed in registration video
    if(!this.isModified("password")) return next()

        this.password = bcrypt.hash(this.password,10)
        next()
})

userSchema.methods.isPasswordCorrect = async function
 (password) {
    return await bcrypt.compare(password,this.password)
}


userSchema.methods.generateAccessToken = function (){
    // short lived access token
   return  jwt.sign({
        _id: this._id,
        email:this.email,
        username:this.username,
        fullname:this.fullname, 
       
        },
        'shhhhh',
    process.env.ACCESS_TOKEN_SECRET,
    {expiresIn:process.env.ACCESS_TOKEN_EXPIRY}
  );
}


userSchema.methods.generateRefreshToken= function (){
    // short lived access token
   return  jwt.sign({
    _id: this._id,
        
    },
    process.env.REFRESH_TOKEN_SECRET,
    {expiresIn:process.env.REFRESH_TOKEN_EXPIRY}
  );
}


export const User = mongoose.model("User",userSchema) 