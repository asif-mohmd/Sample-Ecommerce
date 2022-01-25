var db=require('../config/connection')
var collection=require('../config/collections')
const bcrypt=require('bcrypt')
var objectId=require('mongodb').ObjectID
const { response } = require('express')
const Razorpay=require('razorpay')
var instance = new Razorpay({
    key_id: 'rzp_test_PqTVda4wEWxalf',
    key_secret: '7psKsDAook7Ds7l0UHH4mISC',
  }); 

module.exports={
    doSignup:(userData)=>{
        return new Promise(async(resolve,reject)=>{
            console.log(userData)
            userData.Password=await bcrypt.hash(userData.Password,10)
            
            db.get().collection(collection.USER_COLLECTION).insertOne(userData).then((data)=>{
           
            resolve(userData)           
        })
        })

    },

    doLogin:(userData)=>{
        
        return new Promise(async (resolve,reject)=>{
            let loginStatus=false
            let response={}
            let user=await db.get().collection(collection.USER_COLLECTION).findOne({Email:userData.Email})
            
            if(user){
                bcrypt.compare(userData.Password,user.Password).then((status)=>{
                    if(status){
                        console.log("login success");
                        response.user=user
                        response.status=true
                        console.log(response);
                        resolve(response)
                    }else{
                        console.log('login failed');
                        resolve({status:false})
                    }
                })
            }else{
                console.log('login failed');
                resolve({status:false})
            }
            

        })
    },

    addToCart:(proId,userId)=>{
        let proObj={
            item:objectId(proId),
            quantity:1
        }
        return new Promise(async(resolve,reject)=>{
            let userCart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(userCart){
                let proExist=userCart.products.findIndex(product=> product.item==proId)
                console.log(proExist);
                if(proExist!=-1){
                    db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId),'products.item':objectId(proId)},
                    {
                        $inc:{'products.$.quantity':1}
                    }
                    ).then(()=>{
                        resolve()
                    })
                }else{
                db.get().collection(collection.CART_COLLECTION).updateOne({user:objectId(userId)},
                {
                   
                       $push:{products:(proObj)}
                   }
                
                ).then((response)=>{
                    resolve()
                })
            }  
            }else{
                let cartObj={
                    user:objectId(userId),
                    products:[proObj]
                }
                db.get().collection(collection.CART_COLLECTION).insertOne(cartObj).then((response)=>{
                    resolve()
                })
            }
        })
    },
    getCartProducts:(userId)=>{

        return new Promise(async(resolve,reject)=>{
            let cartItems=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                }
            
            ]).toArray()
            
            resolve(cartItems)
        })
    },
    getCartCount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let count=0
            let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
            if(cart){
                count=cart.products.length
            }
            resolve(count)
        })
    },

    changeProductQuantity:(details)=>{
        details.count=parseInt(details.count)
        details.quantity=parseInt(details.quantity)
        
      
        return new Promise((resolve,reject)=>{

            if(details.count==-1 && details.quantity==1){
                db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:objectId(details.cart)},
                        {
                            $pull:{products:{item:objectId(details.product)}}
                        }
                        ).then((response)=>{
                            resolve({removeProduct:true})
                        })
                    }else{        

            db.get().collection(collection.CART_COLLECTION).updateOne({_id:objectId(details.cart), 'products.item':objectId(details.product)},
                    {
                        $inc:{'products.$.quantity':details.count}
                    }
                    ).then((response)=>{
                        resolve({status:true})
                    })
                }

        })
    },
    getTotalAmount:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let total=await db.get().collection(collection.CART_COLLECTION).aggregate([
                {
                    $match:{user:objectId(userId)}
                },
                {
                    $unwind:'$products'
                },
                {
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'product'
                    }
                },
                {
                    $project:{
                        item:1,quantity:1,product:{$arrayElemAt:['$product',0]}
                    }
                },
                {
                    $group:{
                        _id:null,
                        
                        total:{$sum:{$multiply: ['$quantity', {$toInt: '$product.Price'}]}}
                    }
                }
            
            ]).toArray()
          
            resolve(total[0].total)
        })
   
    },


    removeItem:(details)=>{

        return new Promise((resolve,reject)=>{

        db.get().collection(collection.CART_COLLECTION)
                .updateOne({_id:objectId(details.cart)},
                        {
                            $pull:{products:{item:objectId(details.product)}}
                        }
                        ).then((response)=>{
                            
                            resolve({removeProduct:true})
                        })
          }

      )},

      placeOrder:(order,products,total)=>{
          return new Promise((resolve,reject)=>{
        
              
              let status=order['payment-method']==='COD'?'placed':'pending'
              let orderObj={
                  deliveryDetails:{
                      mobile:order.mobile,
                      adress:order.address,
                      pincode:order.pincode
                  },
                  userId:objectId(order.userId),
                  paymentMethod:order['payment-method'],
                  products:products,
                  totalAmount:total,
                  status:status,
                  date:new Date()
              }

              db.get().collection(collection.ORDER_COLLECTION).insertOne(orderObj).then((response)=>{
                  db.get().collection(collection.CART_COLLECTION).deleteOne({user:objectId(order.userId)})
                  resolve(response.insertedId)
              })

          })

      },
      getCartProductList:(userId)=>{
          return new Promise(async(resolve,reject)=>{
              let cart=await db.get().collection(collection.CART_COLLECTION).findOne({user:objectId(userId)})
              console.log(cart)
              resolve(cart.products)

            })
      },
      getUserOrders:(userId)=>{
        return new Promise(async(resolve,reject)=>{
            let orders=await db.get().collection(collection.ORDER_COLLECTION).find({userId:objectId(userId)}).toArray()
           
            resolve(orders)
        })
    },

    getOrderProducts:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
            let orderItems=await db.get().collection(collection.ORDER_COLLECTION).aggregate([
                {
                    $match:{_id:objectId(orderId)}
                },
                {
                    $unwind:'$products',
                    
                },{
                    $project:{
                        item:'$products.item',
                        quantity:'$products.quantity'
                    }
                },
                {
                    $lookup:{
                        from:collection.PRODUCT_COLLECTION,
                        localField:'item',
                        foreignField:'_id',
                        as:'products'
                    }
                },
                {
                    $project:{
                       item:1,quantity:1,products:{$arrayElemAt:['$products',0]}
                    }
                }
    
            ]).toArray()
            console.log(orderItems);
            resolve(orderItems)
            
        })
    },

    generateRazorpay:(orderId,total)=>{
        return new Promise((resolve,reject)=>{

            instance.orders.create({
                
                amount: total*100,
                currency: "INR",
                receipt: ""+orderId,
                notes: {
                  key1: "value3",
                  key2: "value2"
                }},(err,order)=>{
                    if(err){
                      
                       console.log(err);
                    }else{
                        console.log("New Order :",order);
                       
                        resolve(order)
                    }
                    
                }
            )
          
          
            })
    },
    
    verifyPayment:(details)=>{
            return new Promise((resolve,reject)=>{
                const crypto = require('crypto');
                let hmac = crypto.createHmac('sha256', '7psKsDAook7Ds7l0UHH4mISC');

                hmac.update(details['payment[razorpay_order_id]']+'|'+details['payment[razorpay_payment_id]']);
                hmac=hmac.digest('hex')
                if(hmac==details['payment[razorpay_signature]']){
                    resolve()
                }else{
                    reject()
                }
            })
    },
    


    changePaymentStatus:(orderId)=>{
        return new Promise(async(resolve,reject)=>{
           
          let  dbs=await  db.get().collection(collection.ORDER_COLLECTION).findOne({_id:objectId(orderId)})
            if(dbs){
                console.log('sdbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb')
            }else{
                console.log('dbnot founddddddddddddddddddddddddddddddddddddddddddddddddddddddd')
            }

            db.get().collection(collection.ORDER_COLLECTION).updateOne({_id:objectId(orderId)},
            {
                $set:{
                    status:'placed'
                }
            }).then(()=>{
                resolve()
            })
        })
    }





}