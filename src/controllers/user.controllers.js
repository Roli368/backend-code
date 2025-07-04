import{asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOncloudinary ,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"

const registerUser= asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}=req.body

    //validation
    if(
        [fullname,email,username,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
 const existedUser= await User.findOne({
    $or:[{username},{email}]
})
   if(existedUser){
     throw new ApiError(400," user with email or username Already exist")
   }

   const avatarLocalPath= req.files?.avatar?.[0]?.path
    const coverLocalPath= req.files?.coverImage?.[0]?.path

     if(!avatarLocalPath){
        throw new ApiError(400,"avatar file missing")
    }

//  const avatar= await uploadOncloudinary(avatarLocalPath)
//  let coverImage="" 
//  if (coverLocalPath){
//    coverImage= await uploadOncloudinary(coverImage)
//  }

let avatar;
try {
  avatar=await uploadOncloudinary(avatarLocalPath)
  console.log("Uploaded avatar",avatar)
} catch (error) {
  console.log("Error uploading avatar",error)
  throw new ApiError(500,"Failed to upload avatar")
}

let coverImage;
try {
  coverImage=await uploadOncloudinary(coverLocalPath)
  console.log("Uploaded coverImage",coverImage)
} catch (error) {
  console.log("Error uploading CoverImage",error)
  throw new ApiError(500,"Failed to upload coverImage")
}
 
  try {
    const user= await User.create({
       fullname,
       avatar:avatar.url,
       coverImage:coverImage?.url || "",
       email,
       password,
       username:username.toLowerCase()
     })
   
     const createdUser = await User.findById(user._id).select(
       "-password - refreshToken"
     )
   if (!createdUser){
        throw new ApiError(500,"something went wrong while registering a user")
   } 
  return res
  .status(201)
  .json(new ApiResponse(200,"user registersd successffully"))
  
  } catch (error) {
    console.log("User Creation failed")
    if (avatar) {
      await deleteFromCloudinary(avatar.public_id)
    }
    if (coverImage) {
      await deleteFromCloudinary(coverImage.public_id)
    }
     throw new ApiError(500,"something went wrong while registering a user and images were deleted")
  }
})

export{
    registerUser
}