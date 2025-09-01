// SQLite Database Manager using sql.js
class DatabaseManager {
    constructor() {
        this.db = null;
        this.isInitialized = false;
        this.initPromise = this.initDatabase();
    }

    async initDatabase() {
        try {
            // Load sql.js library
            const sqlPromise = initSqlJs({
                locateFile: file => `https://sql.js.org/dist/${file}`
            });
            
            const SQL = await sqlPromise;
            
            // Try to load existing database from localStorage first (for browser compatibility)
            const savedDb = localStorage.getItem('roklearn_database');
            if (savedDb) {
                const uint8Array = new Uint8Array(JSON.parse(savedDb));
                this.db = new SQL.Database(uint8Array);
                console.log('Loaded database from localStorage');
            } else {
                // Try to load from file if available
                try {
                    const response = await fetch('./db.sqlite');
                    if (response.ok) {
                        const arrayBuffer = await response.arrayBuffer();
                        this.db = new SQL.Database(new Uint8Array(arrayBuffer));
                        console.log('Loaded existing db.sqlite file');
                    } else {
                        throw new Error('Database file not found');
                    }
                } catch (error) {
                    console.log('Creating new database');
                    this.db = new SQL.Database();
                    this.createTables();
                }
            }
            
            this.isInitialized = true;
            console.log('Database initialized successfully');
            return true;
        } catch (error) {
            console.error('Failed to initialize database:', error);
            // Fallback to localStorage-based storage
            this.initFallbackStorage();
            return false;
        }
    }

    initFallbackStorage() {
        console.log('Using localStorage fallback for data storage');
        this.isInitialized = true;
        
        // Initialize storage keys if they don't exist
        if (!localStorage.getItem('roklearn_users')) {
            localStorage.setItem('roklearn_users', JSON.stringify([]));
        }
        if (!localStorage.getItem('roklearn_posts')) {
            localStorage.setItem('roklearn_posts', JSON.stringify([]));
        }
        if (!localStorage.getItem('roklearn_comments')) {
            localStorage.setItem('roklearn_comments', JSON.stringify([]));
        }
        if (!localStorage.getItem('roklearn_likes')) {
            localStorage.setItem('roklearn_likes', JSON.stringify([]));
        }
    }

    createTables() {
        if (!this.db) return;

        // Users table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Posts table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS posts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                description TEXT NOT NULL,
                tags TEXT,
                image_data TEXT,
                audio_data TEXT,
                video_data TEXT,
                author_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                likes_count INTEGER DEFAULT 0,
                FOREIGN KEY (author_id) REFERENCES users (id)
            )
        `);

        // Comments table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        // Likes table
        this.db.run(`
            CREATE TABLE IF NOT EXISTS likes (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id INTEGER NOT NULL,
                user_id INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                UNIQUE(post_id, user_id),
                FOREIGN KEY (post_id) REFERENCES posts (id),
                FOREIGN KEY (user_id) REFERENCES users (id)
            )
        `);

        this.saveDatabase();
    }

    saveDatabase() {
        if (this.db) {
            try {
                const data = this.db.export();
                
                // Save to localStorage (primary storage for browser)
                const buffer = Array.from(data);
                localStorage.setItem('roklearn_database', JSON.stringify(buffer));
                
                console.log('Database saved to localStorage');
            } catch (error) {
                console.error('Failed to save database:', error);
            }
        }
    }

    // User management
    async createUser(name, email, password) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare("INSERT INTO users (name, email, password) VALUES (?, ?, ?)");
                stmt.run([name, email, password]);
                stmt.free();
                this.saveDatabase();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            if (users.find(u => u.email === email)) {
                return { success: false, error: 'Email already exists' };
            }
            
            const newUser = {
                id: Date.now(),
                name,
                email,
                password,
                created_at: new Date().toISOString()
            };
            
            users.push(newUser);
            localStorage.setItem('roklearn_users', JSON.stringify(users));
            return { success: true };
        }
    }

    async authenticateUser(email, password) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
                const result = stmt.get([email, password]);
                stmt.free();
                return result || null;
            } catch (error) {
                console.error('Authentication error:', error);
                return null;
            }
        } else {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            return users.find(u => u.email === email && u.password === password) || null;
        }
    }

    async getUserById(userId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare("SELECT id, name, email, created_at FROM users WHERE id = ?");
                const result = stmt.get([userId]);
                stmt.free();
                return result || null;
            } catch (error) {
                console.error('Get user error:', error);
                return null;
            }
        } else {
            // Fallback to localStorage
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            const user = users.find(u => u.id === userId);
            if (user) {
                const { password, ...userWithoutPassword } = user;
                return userWithoutPassword;
            }
            return null;
        }
    }

    // Post management
    async createPost(title, description, tags, imageData, audioData, videoData, authorId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
                    INSERT INTO posts (title, description, tags, image_data, audio_data, video_data, author_id) 
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                `);
                stmt.run([title, description, tags, imageData, audioData, videoData, authorId]);
                stmt.free();
                this.saveDatabase();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to localStorage
            const posts = JSON.parse(localStorage.getItem('roklearn_posts') || '[]');
            const newPost = {
                id: Date.now(),
                title,
                description,
                tags,
                image_data: imageData,
                audio_data: audioData,
                video_data: videoData,
                author_id: authorId,
                created_at: new Date().toISOString(),
                likes_count: 0
            };
            
            posts.unshift(newPost);
            localStorage.setItem('roklearn_posts', JSON.stringify(posts));
            return { success: true };
        }
    }

    async getAllPosts() {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
                    SELECT p.*, u.name as author_name 
                    FROM posts p 
                    JOIN users u ON p.author_id = u.id 
                    ORDER BY p.created_at DESC
                `);
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            } catch (error) {
                console.error('Get posts error:', error);
                return [];
            }
        } else {
            // Fallback to localStorage
            const posts = JSON.parse(localStorage.getItem('roklearn_posts') || '[]');
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            
            return posts.map(post => {
                const author = users.find(u => u.id === post.author_id);
                return {
                    ...post,
                    author_name: author ? author.name : 'Unknown User'
                };
            });
        }
    }

    async getPostById(postId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
                    SELECT p.*, u.name as author_name 
                    FROM posts p 
                    JOIN users u ON p.author_id = u.id 
                    WHERE p.id = ?
                `);
                const result = stmt.get([postId]);
                stmt.free();
                return result || null;
            } catch (error) {
                console.error('Get post error:', error);
                return null;
            }
        } else {
            // Fallback to localStorage
            const posts = JSON.parse(localStorage.getItem('roklearn_posts') || '[]');
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            
            const post = posts.find(p => p.id === postId);
            if (post) {
                const author = users.find(u => u.id === post.author_id);
                return {
                    ...post,
                    author_name: author ? author.name : 'Unknown User'
                };
            }
            return null;
        }
    }

    // Comment management
    async addComment(postId, userId, content) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare("INSERT INTO comments (post_id, user_id, content) VALUES (?, ?, ?)");
                stmt.run([postId, userId, content]);
                stmt.free();
                this.saveDatabase();
                return { success: true };
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to localStorage
            const comments = JSON.parse(localStorage.getItem('roklearn_comments') || '[]');
            const newComment = {
                id: Date.now(),
                post_id: postId,
                user_id: userId,
                content,
                created_at: new Date().toISOString()
            };
            
            comments.push(newComment);
            localStorage.setItem('roklearn_comments', JSON.stringify(comments));
            return { success: true };
        }
    }

    async getCommentsByPostId(postId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare(`
                    SELECT c.*, u.name as user_name 
                    FROM comments c 
                    JOIN users u ON c.user_id = u.id 
                    WHERE c.post_id = ? 
                    ORDER BY c.created_at ASC
                `);
                const results = [];
                while (stmt.step()) {
                    results.push(stmt.getAsObject());
                }
                stmt.free();
                return results;
            } catch (error) {
                console.error('Get comments error:', error);
                return [];
            }
        } else {
            // Fallback to localStorage
            const comments = JSON.parse(localStorage.getItem('roklearn_comments') || '[]');
            const users = JSON.parse(localStorage.getItem('roklearn_users') || '[]');
            
            return comments
                .filter(c => c.post_id === postId)
                .map(comment => {
                    const user = users.find(u => u.id === comment.user_id);
                    return {
                        ...comment,
                        user_name: user ? user.name : 'Unknown User'
                    };
                })
                .sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
        }
    }

    // Like management
    async toggleLike(postId, userId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                // Check if like exists
                const checkStmt = this.db.prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?");
                const existingLike = checkStmt.get([postId, userId]);
                checkStmt.free();
                
                if (existingLike) {
                    // Remove like
                    const deleteStmt = this.db.prepare("DELETE FROM likes WHERE post_id = ? AND user_id = ?");
                    deleteStmt.run([postId, userId]);
                    deleteStmt.free();
                    
                    // Update post likes count
                    const updateStmt = this.db.prepare("UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?");
                    updateStmt.run([postId]);
                    updateStmt.free();
                    
                    this.saveDatabase();
                    return { success: true, liked: false };
                } else {
                    // Add like
                    const insertStmt = this.db.prepare("INSERT INTO likes (post_id, user_id) VALUES (?, ?)");
                    insertStmt.run([postId, userId]);
                    insertStmt.free();
                    
                    // Update post likes count
                    const updateStmt = this.db.prepare("UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?");
                    updateStmt.run([postId]);
                    updateStmt.free();
                    
                    this.saveDatabase();
                    return { success: true, liked: true };
                }
            } catch (error) {
                return { success: false, error: error.message };
            }
        } else {
            // Fallback to localStorage
            const likes = JSON.parse(localStorage.getItem('roklearn_likes') || '[]');
            const posts = JSON.parse(localStorage.getItem('roklearn_posts') || '[]');
            
            const existingLikeIndex = likes.findIndex(l => l.post_id === postId && l.user_id === userId);
            const postIndex = posts.findIndex(p => p.id === postId);
            
            if (existingLikeIndex !== -1) {
                // Remove like
                likes.splice(existingLikeIndex, 1);
                if (postIndex !== -1) {
                    posts[postIndex].likes_count = Math.max(0, (posts[postIndex].likes_count || 0) - 1);
                }
                localStorage.setItem('roklearn_likes', JSON.stringify(likes));
                localStorage.setItem('roklearn_posts', JSON.stringify(posts));
                return { success: true, liked: false };
            } else {
                // Add like
                const newLike = {
                    id: Date.now(),
                    post_id: postId,
                    user_id: userId,
                    created_at: new Date().toISOString()
                };
                likes.push(newLike);
                if (postIndex !== -1) {
                    posts[postIndex].likes_count = (posts[postIndex].likes_count || 0) + 1;
                }
                localStorage.setItem('roklearn_likes', JSON.stringify(likes));
                localStorage.setItem('roklearn_posts', JSON.stringify(posts));
                return { success: true, liked: true };
            }
        }
    }

    async isPostLikedByUser(postId, userId) {
        await this.initPromise;
        
        if (this.db) {
            try {
                const stmt = this.db.prepare("SELECT id FROM likes WHERE post_id = ? AND user_id = ?");
                const result = stmt.get([postId, userId]);
                stmt.free();
                return !!result;
            } catch (error) {
                console.error('Check like error:', error);
                return false;
            }
        } else {
            // Fallback to localStorage
            const likes = JSON.parse(localStorage.getItem('roklearn_likes') || '[]');
            return likes.some(l => l.post_id === postId && l.user_id === userId);
        }
    }
}

// Load sql.js library
const script = document.createElement('script');
script.src = 'https://sql.js.org/dist/sql-wasm.js';
document.head.appendChild(script);

// Global database instance
const dbManager = new DatabaseManager();