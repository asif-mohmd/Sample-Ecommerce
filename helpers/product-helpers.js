const { Collection, ObjectId } = require('mongodb');
var db=require('../config/connection')
var collection=require('../config/collections')
var objectId=require('mongodb').ObjectID

module.exports={

    addProduct:(product,callback)=>{
        
        db.get().collection('product').insertOne(product).then((data)=>{
            
            callback(data.insertedId)
        })

    },
    getAllProducts:()=>{
        return new Promise(async (resolve,reject)=>{
            let product=await db.get().collection(collection.PRODUCT_COLLECTION).find().toArray()
            resolve(product)
        })
    },

    deleteProduct:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).deleteOne({_id:objectId(prodId)}).then((response)=>{
                
                resolve(response)
            })
        })
    },
    getProductDetails:(prodId)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION).findOne({_id:objectId(prodId)}).then((product)=>{
                resolve(product)
        })
        })
    },
    updateProduct:(proId,ProDetails)=>{
        return new Promise((resolve,reject)=>{
            db.get().collection(collection.PRODUCT_COLLECTION)
            .updateOne({_id:ObjectId(proId)},{
                $set:{
                    Name:ProDetails.Name,
                    Description:ProDetails.Description,
                    Price:ProDetails.Price,
                    Category:ProDetails.Category 
                }

            }).then((response)=>{
                resolve()
            })
        })
    }


}