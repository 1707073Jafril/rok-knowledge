# RokLearn - Interactive Learning Platform

## 🚀 Features

### ✅ **Authentication System**
- User registration and login
- Secure password hashing
- Session management
- **Anyone can view all posts**
- **Only authenticated users can create posts**

### ✅ **Multimedia Posts**
- **Title** and **Description** (required fields)
- **Image** uploads with preview
- **Audio** uploads with player
- **Video** uploads with player
- **Tags** for categorization

### ✅ **Interactive Community**
- **Like** posts (heart icon with count)
- **Comment** on posts
- Real-time interaction updates

### ✅ **SQLite Database**
- Local SQLite database saved as `db.sqlite`
- Uses sql.js for browser compatibility
- Export/Import database functionality
- Tables: users, posts, comments, likes
- Proper relationships and constraints
- Auto-backup to localStorage

## 📁 Files Structure

```
├── index.html          # Main HTML structure
├── styles.css          # Complete styling with responsive design
├── database.js         # SQLite database management
├── auth.js            # Authentication system
├── script.js          # Main application logic
└── README.md          # This file
```

## 🎯 How to Use

1. **Open `index.html`** in any modern web browser
2. **Register** a new account or **Login**
3. **Create Posts** with multimedia content
4. **Like and Comment** on posts
5. **Browse** all posts on the home page

## 🔧 Technical Details

### Database Schema
- **users**: id, name, email, password, created_at
- **posts**: id, title, description, tags, image_data, audio_data, video_data, author_id, created_at, likes_count
- **comments**: id, post_id, user_id, content, created_at
- **likes**: id, post_id, user_id, created_at (unique constraint)

### Authentication
- Simple password hashing (for demo purposes)
- Session persistence in localStorage
- Protected routes for posting

### Media Handling
- File upload with preview
- Base64 encoding for storage
- Support for images, audio, and video
- File size display and removal options

## 🌟 Key Features Implemented

✅ **Website Title**: RokLearn  
✅ **Authentication**: Only logged-in users can post  
✅ **Post Fields**: Title, Description, Audio, Video, Image  
✅ **Community Features**: Anyone can like and comment  
✅ **Database**: SQLite with localStorage fallback  
✅ **Responsive Design**: Works on all devices  
✅ **Real-time Updates**: Likes and comments update instantly  

## 🚀 Getting Started

Simply open `index.html` in your browser and start exploring RokLearn!

The platform includes:
- Modern, responsive design
- Smooth animations and transitions
- Font Awesome icons
- Professional gradient styling
- Mobile-friendly interface

Enjoy learning and sharing knowledge on RokLearn! 🎓