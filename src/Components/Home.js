// src/components/Home.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Home() {
    const [roomCode, setRoomCode] = useState('');
    const navigate = useNavigate();

    const generateCode = () => {
        const newRoomCode = Math.random().toString(36).substr(2, 4);
        navigate(`/chat/${newRoomCode}`);
    };

    const joinRoom = () => {
        if (roomCode) {
            navigate(`/chat/${roomCode}`);
        }
    };

    const resetStorage = () => {
        localStorage.clear(); // This will clear all items from local storage
        alert('Local storage has been cleared!');
    };

    return (
        <div className='Home'>
            <h2>Chat Karo</h2>
            <p>Chat without share your number! your privacy in your hand</p>
            <input 
                type="text" 
                value={roomCode} 
                onChange={(e) => setRoomCode(e.target.value)} 
                placeholder="Enter Room Code" 
            />
            <button onClick={joinRoom}>Join Room</button>
            <button onClick={generateCode}>Generate Code</button>
            <button onClick={resetStorage}>Reset Storage</button>
        </div>
    );
}

export default Home;
