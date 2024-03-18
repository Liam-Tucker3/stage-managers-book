import React, { useState, useEffect } from "react";
import axios from 'axios';
import {useParams} from 'react-router-dom';

function HubIndividual() {
    const params = useParams();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [owner, setOwner] = useState("");

    const formData = {hid: params.hub};
    async function getHubInfo() {
        console.log(formData);
        const url = 'http://localhost:8000/hub-individual';
        axios.post(url, JSON.stringify(formData)).then((response) => {
          console.log(response.data);
          setName(response.data[0].name);
          setDescription(response.data[0].description);
          setOwner(response.data[0].owner);
        });
    }

    useEffect(() => {
        getHubInfo().then();
    }, []);

    return (
        <div>
          <h1>Name: {name}</h1>
          <p>Owner: {owner}</p><br></br>
          <p>Description: {description}</p>
        </div>
    );
}

export default HubIndividual;