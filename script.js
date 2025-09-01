// RokLearn Platform Manager
class RokLearnManager {
    constructor() {
        this.currentSection = 'home';
        this.mediaFiles = {
            image: null,
            audio: null,
            video: null
        };
        this.init();
    }

    async init() {
        // Wait for database to initialize
        await dbManager.initPromise;
        
        this.setupNavigation();
        this.setupPostForm();
        this.setupMediaHandlers();
        await this.renderPosts();
    }

    // Navigation functionality
    setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-link');
        navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetSection = link.getAttribute('href').substring(1);
                this.showSection(targetSection);
                this.updateActiveNavLink(link);
            });
        });
    }

    showSection(sectionId) {
        // Hide all sections
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
            this.currentSection = sectionId;
        }
    }

    updateActiveNavLink(activeLink) {
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        activeLink.classList.add('active');
    }

    // Post management
    setupPostForm() {
        const postForm = document.getElementById('postForm');
        postForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.createPost();
        });
    }

    setupMediaHandlers() {
        // Image upload handler
        document.getElementById('postImage').addEventListener('change', (e) => {
            this.handleMediaUpload(e, 'image');
        });

        // Audio upload handler
        document.getElementById('postAudio').addEventListener('change', (e) => {
            this.handleMediaUpload(e, 'audio');
        });

        // Video upload handler
        document.getElementById('postVideo').addEventListener('change', (e) => {
            this.handleMediaUpload(e, 'video');
        });
    }

    handleMediaUpload(event, mediaType) {
        const file = event.target.files[0];
        const preview = document.getElementById(`${mediaType}Preview`);
        
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                this.mediaFiles[mediaType] = {
                    name: file.name,
                    size: file.size,
                    type: file.type,
                    data: e.target.result
                };
                
                this.showMediaPreview(mediaType, file, e.target.result);
            };
            reader.readAsDataURL(file);
        } else {
            this.mediaFiles[mediaType] = null;
            preview.classList.remove('active');
            preview.innerHTML = '';
        }
    }

    showMediaPreview(mediaType, file, dataUrl) {
        const preview = document.getElementById(`${mediaType}Preview`);
        preview.classList.add('active');
        
        const sizeText = this.formatFileSize(file.size);
        
        let previewHTML = `
            <div class="media-item">
                <div class="media-item-info">
                    <div class="media-item-name">${file.name}</div>
                    <div class="media-item-size">${sizeText}</div>
                </div>
                <button type="button" class="remove-media" onclick="rokLearnManager.removeMedia('${mediaType}')">Remove</button>
            </div>
        `;
        
        if (mediaType === 'image') {
            previewHTML += `<img src="${dataUrl}" alt="Preview">`;
        } else if (mediaType === 'audio') {
            previewHTML += `<audio controls><source src="${dataUrl}" type="${file.type}"></audio>`;
        } else if (mediaType === 'video') {
            previewHTML += `<video controls style="max-height: 200px;"><source src="${dataUrl}" type="${file.type}"></video>`;
        }
        
        preview.innerHTML = previewHTML;
    }

    removeMedia(mediaType) {
        this.mediaFiles[mediaType] = null;
        document.getElementById(`post${mediaType.charAt(0).toUpperCase() + mediaType.slice(1)}`).value = '';
        const preview = document.getElementById(`${mediaType}Preview`);
        preview.classList.remove('active');
        preview.innerHTML = '';
    }

    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    async createPost() {
        if (!authManager.isLoggedIn()) {
            authManager.showError('Please login to create a post');
            return;
        }

        const title = document.getElementById('postTitle').value;
        const description = document.getElementById('postDescription').value;
        const tagsInput = document.getElementById('postTags').value;
        
        if (!title || !description) {
            authManager.showError('Please fill in all required fields');
            return;
        }

        const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
        const currentUser = authManager.getCurrentUser();
        
        try {
            const result = await dbManager.createPost(
                title,
                description,
                tags.join(','),
                this.mediaFiles.image ? this.mediaFiles.image.data : null,
                this.mediaFiles.audio ? this.mediaFiles.audio.data : null,
                this.mediaFiles.video ? this.mediaFiles.video.data : null,
                currentUser.id
            );

            if (result.success) {
                // Clear form and media
                document.getElementById('postForm').reset();
                this.clearAllMedia();
                
                authManager.showSuccess('Post published successfully!');
                
                // Navigate to home and refresh posts
                this.showSection('home');
                this.updateActiveNavLink(document.querySelector('.nav-link[href="#home"]'));
                await this.renderPosts();
            } else {
                authManager.showError('Failed to create post: ' + result.error);
            }
        } catch (error) {
            console.error('Create post error:', error);
            authManager.showError('Failed to create post. Please try again.');
        }
    }

    clearAllMedia() {
        ['image', 'audio', 'video'].forEach(mediaType => {
            this.removeMedia(mediaType);
        });
    }

    async renderPosts() {
        const blogPostsContainer = document.getElementById('blogPosts');
        
        try {
            const posts = await dbManager.getAllPosts();
            
            if (posts.length === 0) {
                blogPostsContainer.innerHTML = `
                    <div style="text-align: center; padding: 3rem; color: #718096;">
                        <h3>No posts yet</h3>
                        <p>${authManager.isLoggedIn() ? 'Start sharing knowledge on RokLearn!' : 'Login to create the first post on RokLearn!'}</p>
                        ${!authManager.isLoggedIn() ? '<button onclick="authManager.showLoginModal()" style="margin-top: 1rem; padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 6px; cursor: pointer;">Login to Post</button>' : ''}
                    </div>
                `;
                return;
            }

            const postsHTML = await Promise.all(posts.map(async (post) => {
                const isLiked = authManager.isLoggedIn() ? 
                    await dbManager.isPostLikedByUser(post.id, authManager.getCurrentUser().id) : false;
                
                const tags = post.tags ? post.tags.split(',').filter(tag => tag.trim()) : [];
                const preview = post.description.substring(0, 200) + (post.description.length > 200 ? '...' : '');
                
                return `
                    <article class="post-card">
                        <div class="post-header">
                            <h3>${this.escapeHtml(post.title)}</h3>
                            <div class="post-meta">
                                <span class="date">${this.formatDate(post.created_at)}</span>
                                <span class="author">${this.escapeHtml(post.author_name)}</span>
                            </div>
                        </div>
                        <div class="post-content">
                            <p>${this.escapeHtml(preview)}</p>
                            ${this.renderPostMedia(post, true)}
                        </div>
                        <div class="post-footer">
                            <div class="post-actions">
                                <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="rokLearnManager.toggleLike(${post.id})">
                                    <i class="fas fa-heart"></i>
                                    <span>${post.likes_count || 0}</span>
                                </button>
                                <button class="comment-btn" onclick="rokLearnManager.readMore(${post.id})">
                                    <i class="fas fa-comment"></i>
                                    Comment
                                </button>
                                <button class="read-more-btn" onclick="rokLearnManager.readMore(${post.id})">Read More</button>
                            </div>
                            <div class="post-tags">
                                ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                            </div>
                        </div>
                    </article>
                `;
            }));

            blogPostsContainer.innerHTML = postsHTML.join('');
        } catch (error) {
            console.error('Render posts error:', error);
            blogPostsContainer.innerHTML = `
                <div style="text-align: center; padding: 3rem; color: #e53e3e;">
                    <h3>Error loading posts</h3>
                    <p>Please refresh the page to try again.</p>
                </div>
            `;
        }
    }

    renderPostMedia(post, isPreview = false) {
        let mediaHTML = '';
        
        if (post.image_data) {
            mediaHTML += `<div class="post-media"><img src="${post.image_data}" alt="Post image"></div>`;
        }
        
        if (!isPreview) {
            if (post.audio_data) {
                mediaHTML += `<div class="post-media"><audio controls><source src="${post.audio_data}"></audio></div>`;
            }
            
            if (post.video_data) {
                mediaHTML += `<div class="post-media"><video controls><source src="${post.video_data}"></video></div>`;
            }
        }
        
        return mediaHTML;
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
    }

    async readMore(postId) {
        try {
            const post = await dbManager.getPostById(postId);
            if (!post) return;

            const isLiked = authManager.isLoggedIn() ? 
                await dbManager.isPostLikedByUser(postId, authManager.getCurrentUser().id) : false;
            
            const comments = await dbManager.getCommentsByPostId(postId);
            const tags = post.tags ? post.tags.split(',').filter(tag => tag.trim()) : [];

            const modalContent = document.getElementById('modalContent');
            modalContent.innerHTML = `
                <h2>${this.escapeHtml(post.title)}</h2>
                <div class="post-meta" style="margin-bottom: 2rem; color: #718096;">
                    <span>${this.formatDate(post.created_at)}</span> • <span>${this.escapeHtml(post.author_name)}</span>
                </div>
                
                <div style="line-height: 1.8; color: #4a5568; margin-bottom: 2rem;">
                    ${this.formatContent(post.description)}
                </div>
                
                ${this.renderPostMedia(post, false)}
                
                <div class="post-actions" style="margin: 2rem 0;">
                    <button class="like-btn ${isLiked ? 'liked' : ''}" onclick="rokLearnManager.toggleLike(${post.id})">
                        <i class="fas fa-heart"></i>
                        <span>${post.likes_count || 0}</span>
                    </button>
                </div>
                
                <div class="post-tags" style="margin-bottom: 2rem;">
                    ${tags.map(tag => `<span class="tag">${this.escapeHtml(tag.trim())}</span>`).join('')}
                </div>
                
                <div class="comments-section">
                    <div class="comments-header">
                        <h4>Comments (${comments.length})</h4>
                    </div>
                    
                    ${authManager.isLoggedIn() ? `
                        <div class="comment-form">
                            <textarea class="comment-input" id="commentInput" placeholder="Write a comment..."></textarea>
                            <button class="comment-submit" onclick="rokLearnManager.addComment(${post.id})">Post Comment</button>
                        </div>
                    ` : `
                        <p style="color: #718096; margin-bottom: 1rem;">Please <a href="#" onclick="authManager.showLoginModal(); return false;" style="color: #667eea;">login</a> to comment.</p>
                    `}
                    
                    <div class="comments-list">
                        ${comments.map(comment => `
                            <div class="comment">
                                <div class="comment-header">
                                    <span class="comment-author">${this.escapeHtml(comment.user_name)}</span>
                                    <span class="comment-date">${this.formatDate(comment.created_at)}</span>
                                </div>
                                <div class="comment-content">${this.escapeHtml(comment.content)}</div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
            
            document.getElementById('postModal').style.display = 'block';
        } catch (error) {
            console.error('Read more error:', error);
            authManager.showError('Failed to load post details');
        }
    }

    async toggleLike(postId) {
        if (!authManager.isLoggedIn()) {
            authManager.showError('Please login to like posts');
            return;
        }

        try {
            const currentUser = authManager.getCurrentUser();
            const result = await dbManager.toggleLike(postId, currentUser.id);
            
            if (result.success) {
                // Update like buttons in both main view and modal
                const likeButtons = document.querySelectorAll(`.like-btn[onclick*="${postId}"]`);
                likeButtons.forEach(btn => {
                    const countSpan = btn.querySelector('span');
                    const currentCount = parseInt(countSpan.textContent) || 0;
                    
                    if (result.liked) {
                        btn.classList.add('liked');
                        countSpan.textContent = currentCount + 1;
                    } else {
                        btn.classList.remove('liked');
                        countSpan.textContent = Math.max(0, currentCount - 1);
                    }
                });
            }
        } catch (error) {
            console.error('Toggle like error:', error);
            authManager.showError('Failed to update like');
        }
    }

    async addComment(postId) {
        if (!authManager.isLoggedIn()) {
            authManager.showError('Please login to comment');
            return;
        }

        const commentInput = document.getElementById('commentInput');
        const content = commentInput.value.trim();
        
        if (!content) {
            authManager.showError('Please enter a comment');
            return;
        }

        try {
            const currentUser = authManager.getCurrentUser();
            const result = await dbManager.addComment(postId, currentUser.id, content);
            
            if (result.success) {
                commentInput.value = '';
                authManager.showSuccess('Comment added successfully!');
                
                // Refresh the modal content
                setTimeout(() => {
                    this.readMore(postId);
                }, 1000);
            } else {
                authManager.showError('Failed to add comment: ' + result.error);
            }
        } catch (error) {
            console.error('Add comment error:', error);
            authManager.showError('Failed to add comment');
        }
    }

    formatContent(content) {
        // Simple formatting: convert line breaks to paragraphs
        return content
            .split('\n\n')
            .map(paragraph => `<p>${this.escapeHtml(paragraph.trim())}</p>`)
            .join('');
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Global functions for HTML onclick handlers
function readMore(postId) {
    rokLearnManager.readMore(postId);
}

function closeModal() {
    document.getElementById('postModal').style.display = 'none';
}

function previewPost() {
    const title = document.getElementById('postTitle').value;
    const description = document.getElementById('postDescription').value;
    const tagsInput = document.getElementById('postTags').value;
    
    if (!title || !description) {
        authManager.showError('Please enter at least a title and description to preview');
        return;
    }

    const tags = tagsInput.split(',').map(tag => tag.trim()).filter(tag => tag);
    const currentUser = authManager.getCurrentUser();
    
    const modalContent = document.getElementById('modalContent');
    modalContent.innerHTML = `
        <h2>${rokLearnManager.escapeHtml(title)}</h2>
        <div class="post-meta" style="margin-bottom: 2rem; color: #718096;">
            <span>Preview</span> • <span>${rokLearnManager.escapeHtml(currentUser ? currentUser.name : 'Anonymous')}</span>
        </div>
        <div style="line-height: 1.8; color: #4a5568;">
            ${rokLearnManager.formatContent(description)}
        </div>
        ${rokLearnManager.mediaFiles.image ? `<div class="post-media"><img src="${rokLearnManager.mediaFiles.image.data}" alt="Preview image"></div>` : ''}
        ${rokLearnManager.mediaFiles.audio ? `<div class="post-media"><audio controls><source src="${rokLearnManager.mediaFiles.audio.data}"></audio></div>` : ''}
        ${rokLearnManager.mediaFiles.video ? `<div class="post-media"><video controls><source src="${rokLearnManager.mediaFiles.video.data}"></video></div>` : ''}
        ${tags.length > 0 ? `
            <div class="post-tags" style="margin-top: 2rem;">
                ${tags.map(tag => `<span class="tag">${rokLearnManager.escapeHtml(tag)}</span>`).join('')}
            </div>
        ` : ''}
    `;
    
    document.getElementById('postModal').style.display = 'block';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('postModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}

// Initialize RokLearn when the page loads
let rokLearnManager;
document.addEventListener('DOMContentLoaded', () => {
    rokLearnManager = new RokLearnManager();
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modal
    if (e.key === 'Escape') {
        closeModal();
    }
    
    // Ctrl/Cmd + Enter to submit form when in write section
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && rokLearnManager.currentSection === 'write') {
        e.preventDefault();
        document.getElementById('postForm').dispatchEvent(new Event('submit'));
    }
});