import React, { useState, useEffect, useCallback } from 'react';
import io from 'socket.io-client';
import { useParams } from 'react-router-dom';

// const socket = io.connect('http://localhost:3001');
const socket = io.connect('https://chatkaro-9i87.onrender.com');

function ChatRoom() {
    const { roomCode } = useParams();
    const [username, setUsername] = useState('');
    const [showChat, setShowChat] = useState(false);
    const [message, setMessage] = useState('');
    const [messageList, setMessageList] = useState([]);
    const [onlineUsers, setOnlineUsers] = useState([]);

    // useCallback to memoize the function
    const handleReceiveMessage = useCallback((data) => {
        console.log('Received message:', data); // Debugging line
        setMessageList((list) => {
            const updatedList = [...list, data];
            localStorage.setItem(`messages_${roomCode}`, JSON.stringify(updatedList));
            return updatedList;
        });
    }, [roomCode]);

    // useCallback to memoize the function
    const handleUpdateOnlineUsers = useCallback((users) => {
        setOnlineUsers(users);
    }, []);

    useEffect(() => {
        // Reset message list when roomCode changes
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            socket.emit('join_room', { room: roomCode, username: storedUsername });
            setShowChat(true);
        }

        // Fetch messages for the new room
        const storedMessages = JSON.parse(localStorage.getItem(`messages_${roomCode}`)) || [];
        setMessageList(storedMessages);

        // Register event listeners
        socket.on('receive_message', handleReceiveMessage);
        socket.on('update_online_users', handleUpdateOnlineUsers);

        // Cleanup function
        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('update_online_users', handleUpdateOnlineUsers);
        };
    }, [roomCode, handleReceiveMessage, handleUpdateOnlineUsers]); // Include memoized functions in dependency array

    const handleJoin = () => {
        if (username !== '') {
            localStorage.setItem('username', username); // Save username to localStorage
            socket.emit('join_room', { room: roomCode, username });
            setShowChat(true);
        }
    };

    const sendMessage = () => {
        if (message !== '') {
            const messageData = {
                room: roomCode,
                content: {
                    message: message,
                    sender: username,
                    time: new Date().toISOString(),
                },
            };

            setMessageList((list) => {
                const updatedList = [...list, messageData.content];
                localStorage.setItem(`messages_${roomCode}`, JSON.stringify(updatedList));
                return updatedList;
            });

            socket.emit('send_message', messageData);
            setMessage('');
        }
    };

    return (
        <div className="chat-room">
            {!showChat ? (
                <div className="join-chat">
                    <input 
                        type="text" 
                        placeholder="Enter your name" 
                        value={username} 
                        onChange={(e) => setUsername(e.target.value)} 
                    />
                    <button onClick={handleJoin}>Join Chat</button>
                </div>
            ) : (
                <div className="chat-container">
                    <nav className="chat-nav">
                        <div className="RoomCode">Room Code: <span>{roomCode}</span> | <i className="bi bi-people-fill"></i> {onlineUsers.length} </div>
                        <ul className="OnlineUser">
                            {onlineUsers.map((user, index) => (
                                <li key={index}>
                                    {user.username} {user.username === username ? '(You)' : ''} 
                                    {user.lastSeen ? `(Last seen: ${new Date(user.lastSeen).toLocaleTimeString()})` : ''}
                                </li>
                            ))}
                        </ul>
                    </nav>
                    <div className="message-list">
                        {messageList.map((msg, index) => (
                            <div 
                                key={index} 
                                className={`message ${msg.sender === username ? 'sent' : 'received'}`}
                            >
                                <div className="message-content">
                                    {msg.sender !== username && <span className='label'><i className="bi bi-person-fill"> </i>{msg.sender}</span> }
                                    <p><i className="bi bi-envelope-open-fill"></i> {msg.message}</p>
                                    <span className="message-time">
                                        <i className="bi bi-alarm"></i> {new Date(msg.time).toLocaleTimeString()}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="message-input">
                        <input 
                            type="text" 
                            value={message} 
                            placeholder='Type your message'
                            onChange={(e) => setMessage(e.target.value)} 
                        />
                        <button onClick={sendMessage}>Send <i className="bi bi-send-fill"></i></button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatRoom;
