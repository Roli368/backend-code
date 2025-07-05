import{asyncHandler} from "../utils/asyncHandler.js"
import {ApiError} from "../utils/apiError.js"
import {User} from "../models/user.models.js"
import { uploadOncloudinary ,deleteFromCloudinary} from "../utils/cloudinary.js"
import {ApiResponse} from "../utils/apiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"

const generateAccessAndRefreshToken = async (userId)=>{
 try {
   const user = await User.findById(userId)
   // small check for user existance
 
   const accessToken = user.generateAccessToken()
   const refreshToken = user.generateRefrashToken()
 
   user.refreshToken= refreshToken
   await user.save({validateBeforeSave: false})
   return {accessToken,refreshToken}
 } catch (error) {
    throw new ApiError(500,"Failed to generate access and refresh token")
 }
}



const registerUser= asyncHandler(async(req,res)=>{
    const {fullname,email,username,password}=req.body

    //validation
    if(
        [fullname,username, email,password].some((field)=>field?.trim()==="")
    ){
        throw new ApiError(400,"All fields are required")
    }
 const existedUser= await User.findOne({
    $or:[{username},{email}]
})
   if(existedUser){
     throw new ApiError(409," user with email or username Already exist")
   }
   console.log(req.files)

   const avatarFilename=req.files?.avatar?.[0]?.filename;
   const avatarLocalPath= `./public/temp/${avatarFilename}`


    const coverFilename= req.files?.coverImage?.[0]?.filename;
    const coverLocalPath= coverFilename?`./public/temp/${coverFilename}` : null

     if(!avatarLocalPath){
        throw new ApiError(400,"avatar file missing")
    }
    
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
  console.log("Error uploading CoverImage",error.message || error)
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
       "-password -refreshToken"
     )
   if (!createdUser){
        throw new ApiError(500,"something went wrong while registering a user")
   } 
  return res
  .status(201)
  .json(new ApiResponse(200,createdUser,"user registersd successffully"))  //after it to check
  
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

//how to write login controller in MERN backend

const loginUser = asyncHandler(async (req, res) => {
    // get data from  body
    const { email,username, password } = req.body;

    // validation
    if(!email) {
        throw new ApiError(400, "Email is required");
    }

     const user= await User.findOne({
    $or:[{username},{email}]
      })

      if(!user){
        throw new ApiError(404,"User not found")
      }

      // validate password

      const isPasswordValid = await user.isPasswordCorrect(password)
      if(!isPasswordValid){
        throw new ApiError(401,"Invalid password")
      }

      const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

      const looggedInUser = await User.findById(user._id).select("-password -refreshToken" );

      const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        
      }
      return res
      .status(200)
      .cookie("accessToken",accessToken,options)
      .cookie("refreshToken",refreshToken,options)
      .json(new ApiResponse(200,looggedInUser,"User logged in successfully"

      ))

    })

    const logoutUser = asyncHandler(async (req, res) => {
      await User.findOneAndUpdate(
        
        req.user._id,
        { refreshToken: undefined },
        { new: true }
        
   )

   const options = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
  }
  return res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out successfully"));


    })

    const refreshAccessToken = asyncHandler(async (req, res) => {

const incomingRefreshToken=req.cookies.refreshToken ||req.body.refreshToken 
if(!incomingRefreshToken){
    throw new ApiError(401,"Refresh token is required")
}
try {
    const decodedToken = jwt.verify(incomingRefreshToken,process.env.REFRESH_TOKEN_SECRET)
    const user = await User.findById(decodedToken._id)
    if(!user){
        throw new ApiError(404,"invalid refresh token")
    }
if(incomingRefreshToken !== user.refreshToken){
    throw new ApiError(401,"Invalid refresh token") 
} 
    
    const options = {
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        
      }

const {accessToken,refreshToken:newRefreshToken} = await   generateAccessAndRefreshToken(user._id)
return res
    .status(200)
    .cookie("refreshToken",newRefreshToken,options)
    .cookie("accessToken",accessToken,options)
    .json(new ApiResponse(
      200,
      {accessToken,
        refreshToken:newRefreshToken
      },
      "Access token refreshed successfully"
    ))


   }catch (error) {
  throw new ApiError(500,"something went wrong while refreshing access token  ")
}
    }) 

    const changeCurrentPassword = asyncHandler(async (req, res) => {
      const{oldPassword,newPassword}=req.body
      const user = await User.findById(req.user._id)
      const isPasswordValid = await user.isPasswordCorrect(oldPassword)
      if(!isPasswordValid){
        throw new ApiError(401,"Invalid old password")
      }
      user.password = newPassword
      await user.save({validateBeforeSave:false})
      return res.status(200).json(new ApiResponse(200,{}, "Password changed successfully"))

    })

    const getCurrentUser = asyncHandler(async (req, res) => {
      return res.status(200).json(new ApiResponse(200,req.user,"current user datails"))

    })

    const updateAccountdetails = asyncHandler(async (req, res) => {
      const {fullname,email} = req.body
      if(!fullname || !email){
        throw new ApiError(400,"Fullname and email are required")
      }
      User.findById().select("-password ")

 const user = await User.findByIdAndUpdate(
        req.user._id,
        {
          $set: {
            fullname,
            email: email
          }
},
        {new:true}
      ).select("-password -refreshToken")
      return res.status(200).json(new ApiResponse(200,user,"Account details updated successfully"))
    })


    const updateUserAvatar = asyncHandler(async (req, res) => {
      const avatarLocalPath=req.files?.path 
      if(!avatarLocalPath){
        throw new ApiError(400,"File is required")
      }
      const avatar= await uploadOncloudinary(avatarLocalPath)
      if(!avatar.url){
        throw new ApiError(500,"Something went wrong while uploading avatar ") 
      }
  const user = await User.findByIdAndUpdate(
        req.user._id,   
        {
          $set: {
            avatar: avatar.url
          }
        },
       { new:true}
      ).select("-password -refreshToken" )

      res.status(200).json(new ApiResponse(200,user,"Avatar updated successfully"))

    })

    const updateUserCoverImage = asyncHandler(async (req, res) => {
   const coverImageLocalPath=req.file?.path
   if(!coverImageLocalPath){
    throw new ApiError(400,"File is required")
   }
   const coverImage= await uploadOncloudinary(coverImageLocalPath)


    if(!coverImage.url){
        throw new ApiError(500,"Something went wrong while uploading cover image")    
    }
    const user = await User.findByIdAndUpdate(  
req.user._id,
        {
          $set: {
            coverImage: coverImage.url
          }
        },
        { new:true}
        
    ).select("-password -refreshToken")
    return res.status(200).json(new ApiResponse(200,user,"Cover image uploaded successfully"))
})


const getUserChannelProfile = asyncHandler(async (req, res) => {
const {username}=req.params
if(!username?.trim()){
    throw new ApiError(400,"Username is required")
}
const channel= await User.aggregate(
  [
    {
    $match:{
      username:username?.toLowerCase()  
     }
  },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"channel",
        as:"subscribers"
      }
    },
    {
      $lookup:{
        from:"subscriptions",
        localField:"_id",
        foreignField:"subscribers",
        as:"subscribedTo"
      }
    },
    {
      $addFields:{
        subscriberCount:{
          $size:"$subscribers"
        },
        channelsSubscribedToCount:{
          $size:"$subscribedTo"
        },
      isSubscribed:{
        $cond:{
          if:{$in:[req.user?._id,"$subscribedTo.subscriber"]},
          then:true,
          else:false
        }
      }
    }
    },
    {
      // project only the necessary data
      $project:{
        fullname:1,
        username:1,
        avatar:1,
        coverImage:1,
        subscriberCount:1,
        channelsSubscribedToCount:1,
        isSubscribed:1,
        email:1
      }
    }
  ]
)
if(!channel?.length){
  throw new ApiError(404,"Channel not found")

    }
    return res.status(200).json(new ApiResponse(
      200,
      channel[0],
      "Channel profile fetched successfully")) 
})

const getWatchHistory = asyncHandler(async (req, res) => {
  const user= await User.aggregate([
    {
      $match:{
        _id:new mongoose.Types.ObjectId(req.user?.id)
      }
    },
    {
      $lookup:{
        from:"videos",
        localField:"watchHistory",
        foreignField:"_id",
        as:"watchHistory",
        pipeline:[
          {
            $lookup:{
              from:"users",
              localField:"owner",
              foreignField:"_id",
              as:"owner",
              pipeline:[
                {
                  $project:{
                    fullname:1,
                    username:1,
                    avatar:1
                  }
                }
              ]

            }
          },
          {
            $addFields:{
              owner:{
                $first:"$owner"
              }
            }
          }
        ]
      }
    }
        
  ])

  return res.status(200).json(new ApiResponse(200,user[0]?.watchHistory,"watch history fetched successfully"))
})

export{
    registerUser
    ,loginUser
    ,refreshAccessToken
    ,logoutUser
    ,changeCurrentPassword
    ,getCurrentUser 
    ,updateAccountdetails
    ,updateUserAvatar
    ,updateUserCoverImage

}