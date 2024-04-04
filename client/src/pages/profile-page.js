import React, { useState, useEffect } from 'react';
import ReactDOM from "react-dom/client";
import axios from 'axios';
//import './pages.css';
import './new-profile/new-profile-page.css';

const ProfilePage = () => {

    const [name, setName] = useState("NAME");
    const [bio, setBio] = useState("BIO TEXT");
    const [email, setEmail] = useState("EMAIL ADDRESS");
    const [phoneNumber, setPhoneNumber] = useState("PHONE NUMBER");
    const [pronouns, setPronouns] = useState("PRONOUNS");
    const [roles, setRoles] = useState("ROLES");
    const [uid, setUid] = useState("-1");

    const [formData, setFormData] = useState({
        sessionID: "-1"
    });

    useEffect(() => {
        // setUid(localStorage.uid);

        const url = 'http://localhost:8000/loadProfile';
        // Converting form to json format

        // Preparing data to send to axios
        console.log("profile-page sending axios post");
        setFormData({ ...formData, sessionID: localStorage.getItem("sessionID") });
        console.log("SessionID");
        console.log(localStorage.getItem("sessionID"));

        axios.post(url, JSON.stringify({ "sessionID": localStorage.getItem("sessionID") })).then((response) => {

            console.log("BACK TO PROFILE PAGE");
            console.log(response);
            console.log(response.data);

            // Updating data
            setName(response.data.name);
            setBio(response.data.bio);
            setEmail(response.data.email_address);
            setPhoneNumber(response.data.phone_number);
            setPronouns(response.data.pronouns);
            setRoles(response.data.roles);
        });

    }, []);

    return (
        <div className='body-screen'>
            <div className="ui-container" id="ui-container">
                <div className="container">
                    <div className="profile-content"><img src="https://source.unsplash.com/600x600/?abstract" alt="Profile Picture" className="profile-picture" />
                        <h1 className="title" htmlFor="name">{name}</h1>
                        <p className="subtitle" htmlFor="roles">{roles}</p>
                        <p className="subtitle" htmlFor="pronouns">{pronouns}</p>
                    </div>
                    <div className="bio">
                        <h2 className="heading">Bio</h2>
                        <p className="description" htmlFor="bio">{bio}</p>
                    </div>
                    <div className="gallery">
                        <h2 className="heading">Gallery</h2>
                        <div className="images"><img src="https://source.unsplash.com/600x600/?abstract" alt="Gallery Image" className="gallery-image" /><img src="https://source.unsplash.com/600x600/?abstract" alt="Gallery Image" className="gallery-image" /><img src="https://source.unsplash.com/600x600/?abstract" alt="Gallery Image" className="gallery-image" /></div>
                    </div>
                    <div className="contact-info">
                        <h2 className="heading">Contact Information</h2>
                        <p className="description" htmlFor="email">{email}</p>
                        <p className="description" htmlFor="phoneNumber">{phoneNumber}</p>
                    </div>
                </div>
            </div>
        </div>
    );
    //old profile below
    // return (
    //     <div className='right-side'>
    //     <div className="container">
    //         <div className="content">
    //             <h1 className="profile-h1">User Profile</h1>
    //             <div className="profile-info">
    //                 <div className="profile-details">
    //                     <label htmlFor="name">Name: {name}</label><br /><br />
    //                     <label htmlFor="pronouns">Preferred Pronouns:{pronouns} </label><br /><br />
    //                     <label htmlFor="roles">Roles: {roles}</label><br /><br />
    //                 </div>

    //                 <div className="about-me">
    //                     <label htmlFor="bio">Bio: {bio}</label><br />
    //                     <label htmlFor="email">Email: {email}</label><br />
    //                     <label htmlFor="phoneNumber">Phone Number: {phoneNumber}</label><br />
    //                 </div>


    //                 {/* <label htmlFor="name">Name: </label>
    //                 <span>{name}</span> <br /> */}

    //                 {/* <label htmlFor="bio">Bio: </label>
    //                 <span>{bio}</span> <br /> */}

    //                 {/* <label htmlFor="email">Email Address: </label>
    //                 <span>{email}</span> <br /> */}

    //                 {/* <label htmlFor="phoneNumber">Phone Number: </label>
    //                 <span>{phoneNumber}</span> <br /> */}

    //                 {/* <label htmlFor="pronouns">Preferred Pronouns: </label>
    //                 <span>{pronouns}</span> <br /> */}

    //                 {/* <label htmlFor="roles">Roles: </label>
    //                 <span>{roles}</span> <br /> */}

    //             </div>
    //         </div>
    //     </div>
    //     </div>
    // );
};

export default ProfilePage;
