import React, { useState, useEffect } from "react";
import axios from 'axios';
import {useParams} from 'react-router-dom';
import { useNavigate, Navigate } from "react-router-dom";
import './hub-individual.css';

function HubIndividual() {
    let navigate = useNavigate();
    const params = useParams();
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [whitelist, setWhitelist] = useState({});
    const [members, setMembers] = useState([]);
    const [owner, setOwner] = useState("");

    // const [formData, setFormData] = useState({
    //   hid: "01"
    // });

    const formData = {hid: params.hub};

    async function getHubInfo() {
        console.log(formData);
        const url = 'http://localhost:8000/hub-individual';
        await axios.post(url, JSON.stringify(formData)).then((response => {
          console.log(response.data);
          setName(response.data[0].name);
          setDescription(response.data[0].description);
          setOwner(response.data[0].owner);
          setWhitelist(response.data[0].whitelist);
        }));
    }

    async function routeChange(destination) { 
      let path = `/hubs/${formData.hid}/${destination}`; 
      navigate(path);
    }

    async function retrieveMembers() {
      await getHubInfo();
      console.log(whitelist)
      const url = 'http://localhost:8000/retrieve-members';
      await axios.post(url, JSON.stringify(whitelist)).then((response => {
        console.log(response.data);
        setMembers(response.data)
      }));
      console.log(members);
    }

    useEffect(() => {
        retrieveMembers().then();
    }, []);

    return (
        <div className="bucket">
          <div className="title">
            <h1 className="cat-header">{name}</h1>
          </div>
          <div className="members">
            <h1 className="cat-header">Members</h1>
            {members.map((member) => (
                <p className="regular-text">{member.name}</p>
            ))}
          </div>
          <div className="overview">
            <h1 className="cat-header">Overview</h1>
            <p className="regular-text">{description}</p>
          </div>
          <div className="links">
            <h1 className="cat-header">Links</h1>
            <button className="hubs-button" onClick={() => routeChange("resources")}>Resources</button>
            <button className="hubs-button" onClick={() => routeChange("designer")}>Designer</button>
          </div>
          <div className="schedule">
            <h1 className="cat-header">Schedule</h1>
          </div>
          <div className="notifications">
            <h1 className="cat-header">Notifications</h1>
          </div>
        </div>
    );
}

export default HubIndividual;