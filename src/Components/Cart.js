import { Typography, Grid, Paper, Button } from "@mui/material";
import { Link, useNavigate } from "react-router-dom";
import "./Cart.css";
import { db, auth } from "./Firebase";
import { ref, update, get, onValue } from "firebase/database";
import { useState, useEffect } from "react";
import React, { useContext } from 'react';
import DataContext from './DataContext';
import QuantitySelector from "./QuantitySelector";
import Loader from "./Loader";

const CartPage = () => {

    const response = useContext(DataContext);
    const [cartObjects, setCartObjects] = useState([]);
    const navigate = useNavigate();
    //loader
    const [isLoading, setIsLoading] = useState(false);
    const enableLoader = () => {
        setIsLoading(true);
    };
    const disableLoader = () => {
        setIsLoading(false);
    };

    useEffect(() => {
        // This will hold the unsubscribe function for Firebase's onAuthStateChanged
        let authUnsubscribe;
    
        // This will hold the unsubscribe function for Firebase's onValue
        let dbUnsubscribe;
        
        authUnsubscribe = auth.onAuthStateChanged(user => {
            if (user) {
                // User is authenticated, fetch cart objects from DB
                const userRef = ref(db, 'Users/' + user.uid);
                dbUnsubscribe = onValue(userRef, (snapshot) => {
                    const userData = snapshot.val();
                    if (userData) {
                        const cartObjectss = userData.cart_objects || [];
                        setCartObjects(cartObjectss);
                        console.log('User Cart Objects:', cartObjectss);
                    } else {
                        console.log('User not found.');
                    }
                }, {
                    onlyOnce: true
                });
            } else {
                // User is not authenticated, fetch cart objects from local storage
                const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
                console.log("printing debug", storedCart);
                setCartObjects(storedCart);
            }
        });
    
        return () => {
            // Cleanup listeners when the component is unmounted
            if (authUnsubscribe) authUnsubscribe();
            if (dbUnsubscribe) dbUnsubscribe();
        };
    }, []);
    


    console.log(response)

    if (!response) {
        // Render a loading indicator or return null
        return (
            <div style={{ width: "100%", height: "1200px", justifyContent: "center", alignItems: "center", position: "relative" }}>
                <Loader />
            </div>
        )
    }

    const products = Object.values(response.Products);
    const { Hero_stuff: heroStuffData } = response;
    const heroProd = heroStuffData.hero_prod;
    products.push(heroProd)

    var finalProducts = []
    var prodCartCount = []

    var totalPrice = parseInt(0)
    for (const mproduct in products) {
        for (const cproduct in cartObjects) {
            if (products[mproduct].productID === cartObjects[cproduct].prodId) {
                finalProducts.push(products[mproduct])
                prodCartCount.push(cartObjects[cproduct].count)
                totalPrice += parseInt(products[mproduct].price * cartObjects[cproduct].count)
            }
        }
    }

    console.log(cartObjects)



    const linkStyles = {
        textDecoration: 'none',
        color: 'inherit',
        outline: 'none',
    };

    const paperStyles = {
        margin: 1,
        padding: 1,
        display: 'flex',
        flexDirection: 'row',
        boxShadow: '0px 2px 10px rgba(0, 0, 0, 0)',
        backgroundColor: '#F5F0FF',
    };

    const divtextStyle = {
        fontWeight: 'bold',
        fontSize: '16px',
        color: '#333333',
        cursor: "pointer"
    };

    const handleItemClick = (productId) => {
        navigate(`/product/${productId}`);
    };

    const handleRemoveFromCart = async (productId) => {
        // Handle removing the item from the cart
        try {
            enableLoader()
            const user = auth.currentUser;
            if (user) {
                const userId = user.uid;
                const userRef = ref(db, `Users/${userId}`);
                const snapshot = await get(userRef);
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    const cartObjects = userData.cart_objects || [];
                    const updatedCartObjects = cartObjects.filter(item => item.prodId !== productId);
                    await update(userRef, { cart_objects: updatedCartObjects });
                    console.log("Item removed from the cart.");
                    disableLoader()
                }
            } else {
                // User is not authenticated, remove the item from local storage
                const storedCart = JSON.parse(localStorage.getItem("cart")) || [];
                const updatedCart = storedCart.filter(item => item.prodId !== productId);
                localStorage.setItem("cart", JSON.stringify(updatedCart));
                console.log("Item removed from local cart.");
                disableLoader()
            }

            // Update the cart objects displayed in the UI
            setCartObjects(prevCart => prevCart.filter(item => item.prodId !== productId));
        } catch (error) {
            console.error("Error removing item from the cart:", error);
            disableLoader()
        }
    };

    const handleQuantityChange = (productId, newQuantity) => {
        // Find the index of the product in the cartObjects array
        const productIndex = cartObjects.findIndex(item => item.prodId === productId);

        if (productIndex !== -1) {
            enableLoader()
            // Clone the cartObjects array to avoid modifying the state directly
            const updatedCart = [...cartObjects];

            // Update the quantity of the specific item
            updatedCart[productIndex].count = newQuantity;

            // Update the state with the new cartObjects array
            setCartObjects(updatedCart);

            // Update the cart in local storage if the user is not authenticated
            if (!auth.currentUser) {
                localStorage.setItem('cart', JSON.stringify(updatedCart));
                disableLoader()
            } else {
                // Update the cart in the database if the user is authenticated
                const userRef = ref(db, `Users/${auth.currentUser.uid}`);
                update(userRef, { cart_objects: updatedCart })
                    .then(() => {
                        console.log("Item quantity updated in the cart.");
                        disableLoader()
                    })
                    .catch((error) => {
                        console.error("Error updating item quantity in the cart:", error);
                        disableLoader()
                    });
            }
        }
    };

    return (
        <div className="main-layout">
            {cartObjects.length === 0 ? (
                <div>
                    <div style={{ marginTop: "100px", padding: "20px", display: "flex", flexDirection: "column", textAlign: "center", alignContent: "center" }}>
                        <Typography variant="h6" component="h2" align="left" gutterBottom sx={{ margin: 2 }}>
                            Your Cart is Empty
                        </Typography>
                        <p>Add items to checkout from here!</p>
                    </div>
                </div>
            ) : (
                <>
                    <div className="cart-list" style={{ display: "flex", flexDirection: "column", flex: 1, marginTop: "100px" }}>
                        {isLoading && <Loader />}
                        <Typography variant="h6" component="h2" align="left" gutterBottom sx={{ margin: 2 }}>
                            Your Cart
                        </Typography>

                        <Grid container sx={{ justifyContent: "center", display: "flex", flexDirection: "column" }}>
                            {finalProducts.map((product, index) => (
                                <Grid item key={index} sx={{ borderBottom: "1px solid #ccc" }}>
                                    <Paper sx={paperStyles}>
                                        <img
                                            src={product.image[0]}
                                            alt={product.title}
                                            style={{ width: "80px", height: "80px", cursor: "pointer" }}
                                            onClick={() => handleItemClick(product.productID)}
                                        />
                                        <div style={{ marginLeft: "40px", display: "flex", flexDirection: "column" }}>
                                            <div style={divtextStyle} onClick={() => handleItemClick(product.productID)}>
                                                {product.title}
                                            </div>
                                            <div>
                                                <div
                                                    style={{ color: "grey", fontWeight: "bold", marginTop: "4px", marginBottom: "4px", cursor: "pointer" }}
                                                    onClick={() => handleItemClick(product.productID)}
                                                >
                                                    ₹ {product.price}
                                                </div>
                                            </div>
                                            <div style={{ display: "flex", flexDirection: "row", alignItems: "center" }}>
                                                <QuantitySelector
                                                    quantity={prodCartCount[index]}
                                                    onQuantityChange={(newQuantity) => handleQuantityChange(product.productID, newQuantity)}
                                                    productId={product.productID}
                                                />
                                                <button
                                                    onClick={() => handleRemoveFromCart(product.productID)}
                                                    style={{
                                                        cursor: "pointer", border: "none", background: "transparent",
                                                        textDecoration: "underline",
                                                        color: "black", marginLeft: "10px"
                                                    }}
                                                >
                                                    Remove
                                                </button>
                                            </div>
                                        </div>
                                    </Paper>
                                </Grid>
                            ))}
                        </Grid>
                    </div>
                    <div className="subtotal-section" style={{ flex: 1 }}>
                        <h3>Sub Total : {totalPrice}</h3>
                        <div>delivery charges or any available offers related information will be shown here at this layout</div>
                        <Link to={`/checkout`} style={linkStyles}>
                            <Button sx={{ margin: "20px" }} variant="contained">
                                Checkout
                            </Button>
                        </Link>
                    </div>
                </>
            )}
        </div>
    );
}

export default CartPage;