import React, { useState, useEffect, useCallback, useRef } from 'react';
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
    const [typingUsers, setTypingUsers] = useState([]);
    const [hasReloaded, setHasReloaded] = useState(false);
    const typingTimeoutRef = useRef(null);
    const broadcastChannelRef = useRef(null);
 

    useEffect(() => {
        // Setup BroadcastChannel to communicate between tabs
        broadcastChannelRef.current = new BroadcastChannel(`chat-room-${roomCode}`);

        broadcastChannelRef.current.onmessage = (event) => {
            if (event.data === 'new_tab_opened') {
                // Disconnect socket and disable chat in this tab
                socket.disconnect();
                setShowChat(false);
               
            }
        };

        return () => {
            if (broadcastChannelRef.current) {
                broadcastChannelRef.current.close();
            }
        };
    }, [roomCode]);

    useEffect(() => {
        const existingTab = sessionStorage.getItem(`chat-room-open-${roomCode}`);

        if (existingTab) {
            broadcastChannelRef.current.postMessage('new_tab_opened');
        } else {
            sessionStorage.setItem(`chat-room-open-${roomCode}`, 'true');
            
        }

        return () => {
            sessionStorage.removeItem(`chat-room-open-${roomCode}`);
            
        };
    }, [roomCode]);

    const handleReceiveMessage = useCallback((data) => {
        setMessageList((list) => {
            const updatedList = [...list, data];
            localStorage.setItem(`messages_${roomCode}`, JSON.stringify(updatedList));
            return updatedList;
        });
    }, [roomCode]);

    const handleUpdateOnlineUsers = useCallback((users) => {
        setOnlineUsers(users);
    }, []);

    const handleDisplayTyping = useCallback((data) => {
        setTypingUsers((prev) => {
            if (!prev.includes(data.username)) {
                return [...prev, data.username];
            }
            return prev;
        });
    }, []);

    const handleHideTyping = useCallback((data) => {
        setTypingUsers((prev) => prev.filter((username) => username !== data.username));
    }, []);

    useEffect(() => {
        const storedUsername = localStorage.getItem('username');
        if (storedUsername) {
            setUsername(storedUsername);
            socket.emit('join_room', { room: roomCode, username: storedUsername });
            setShowChat(true);
        }

        const storedMessages = JSON.parse(localStorage.getItem(`messages_${roomCode}`)) || [];
        setMessageList(storedMessages);

        socket.on('receive_message', handleReceiveMessage);
        socket.on('update_online_users', handleUpdateOnlineUsers);
        socket.on('display_typing', handleDisplayTyping);
        socket.on('hide_typing', handleHideTyping);

        return () => {
            socket.off('receive_message', handleReceiveMessage);
            socket.off('update_online_users', handleUpdateOnlineUsers);
            socket.off('display_typing', handleDisplayTyping);
            socket.off('hide_typing', handleHideTyping);
        };
    }, [roomCode, handleReceiveMessage, handleUpdateOnlineUsers, handleDisplayTyping, handleHideTyping]);

    const handleJoin = () => {
        if (username !== '') {
            // Only set session storage and local storage if not already set
            if (!sessionStorage.getItem(`joined_${roomCode}`)) {
                localStorage.setItem('username', username);
                sessionStorage.setItem(`joined_${roomCode}`, username);
                socket.emit('join_room', { room: roomCode, username });
                setShowChat(true);
            }
        }
    };

    const sendMessage = () => {
        if (message !== '') {
            const messageData = {
                room: roomCode,
                content: {
                    message,
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
            socket.emit('stop_typing', { room: roomCode });
        }
    };

    const handleTyping = () => {
        socket.emit('typing', { room: roomCode });
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop_typing', { room: roomCode });
        }, 2000);
    };

    useEffect(() => {
        // Check if the page has been reloaded in this session
        const reloaded = sessionStorage.getItem('page_reloaded');
        if (reloaded) {
            setHasReloaded(true);
        }
    }, []);

    const handleReload = () => {
        if (!hasReloaded) {
            sessionStorage.setItem('page_reloaded', 'true'); // Mark page as reloaded
            window.location.reload(); // Reload the current page
        }
    };

    const handleInvite = () => {
        // Generate the invite link
        const inviteLink = `${window.location.origin}/chat/${roomCode}`;

        // Copy the invite link to the clipboard
        navigator.clipboard.writeText(inviteLink).then(() => {
            alert('Invite link copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy invite link:', err);
        });
    };


    return (
        <div className="chat-room">
         <button 
            onClick={handleReload} 
            disabled={hasReloaded} 
            className={hasReloaded ? 'btn-reloaded' : 'btn-reload'}
        >
            {<i class="bi bi-arrow-clockwise"></i>}     
        </button>

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
                        <div className="RoomCode">Room Code: <span>{roomCode}</span> | <i className="bi bi-people-fill"></i> {onlineUsers.length } | <i class="bi bi-person-plus-fill" onClick={handleInvite}> Invite</i>
                        </div>
                
                        <ul className="OnlineUser">
                            {onlineUsers.length === 0 ? (
                                <li className="connecting-message">Connecting...</li>
                            ) : (
                                onlineUsers.map((user, index) => (
                                    <li key={index}>
                                        {user.username} {user.username === username ? '(You)' : ''} 
                                    </li>
                                ))
                            )}
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
                    <div className="typing-status">
                        {typingUsers.length > 0 && <p>{typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...</p>}
                    </div>
                    <div className="message-input">
                        <input 
                            type="text" 
                            value={message} 
                            placeholder='Type your message'
                            onChange={(e) =>{ setMessage(e.target.value);
                                handleTyping();
                             } } 
                        />
                        <button onClick={sendMessage}>Send <i className="bi bi-send-fill"></i></button>
                    </div>
                </div>
            )}
        </div>
    );
}

export default ChatRoom;
