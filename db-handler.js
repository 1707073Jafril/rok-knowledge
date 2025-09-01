// Database File Handler for RokLearn
class DatabaseFileHandler {
    constructor() {
        this.dbName = 'db.sqlite';
        this.setupFileHandlers();
    }

    setupFileHandlers() {
        // Add database export functionality
        this.addExportButton();
        this.addImportHandler();
    }

    addExportButton() {
        // Add export button to the page
        const exportBtn = document.createElement('button');
        exportBtn.innerHTML = '<i class="fas fa-download"></i> Export Database';
        exportBtn.className = 'export-db-btn';
        exportBtn.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        exportBtn.addEventListener('click', () => this.exportDatabase());
        document.body.appendChild(exportBtn);
    }

    addImportHandler() {
        // Add hidden file input for database import
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '.sqlite,.db';
        fileInput.style.display = 'none';
        fileInput.id = 'dbImportInput';
        
        fileInput.addEventListener('change', (e) => this.importDatabase(e));
        document.body.appendChild(fileInput);

        // Add import button
        const importBtn = document.createElement('button');
        importBtn.innerHTML = '<i class="fas fa-upload"></i> Import Database';
        importBtn.className = 'import-db-btn';
        importBtn.style.cssText = `
            position: fixed;
            bottom: 80px;
            right: 20px;
            background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
            color: white;
            border: none;
            padding: 0.75rem 1rem;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 1000;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        `;
        
        importBtn.addEventListener('click', () => fileInput.click());
        document.body.appendChild(importBtn);
    }

    async exportDatabase() {
        try {
            if (dbManager.db) {
                const data = dbManager.db.export();
                const blob = new Blob([data], { type: 'application/x-sqlite3' });
                
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = this.dbName;
                a.style.display = 'none';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                
                if (authManager) {
                    authManager.showSuccess('Database exported successfully!');
                }
            } else {
                throw new Error('No database available to export');
            }
        } catch (error) {
            console.error('Export error:', error);
            if (authManager) {
                authManager.showError('Failed to export database');
            }
        }
    }

    async importDatabase(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const arrayBuffer = await file.arrayBuffer();
            const uint8Array = new Uint8Array(arrayBuffer);
            
            // Load sql.js if not already loaded
            if (!window.SQL) {
                const SQL = await initSqlJs({
                    locateFile: file => `https://sql.js.org/dist/${file}`
                });
                window.SQL = SQL;
            }
            
            // Create new database from imported file
            const newDb = new window.SQL.Database(uint8Array);
            
            // Replace current database
            if (dbManager.db) {
                dbManager.db.close();
            }
            dbManager.db = newDb;
            
            // Refresh the UI
            if (rokLearnManager) {
                await rokLearnManager.renderPosts();
            }
            
            if (authManager) {
                authManager.showSuccess('Database imported successfully!');
            }
            
            // Clear the file input
            event.target.value = '';
            
        } catch (error) {
            console.error('Import error:', error);
            if (authManager) {
                authManager.showError('Failed to import database. Please check the file format.');
            }
        }
    }

    // Auto-save database periodically
    startAutoSave() {
        setInterval(() => {
            if (dbManager && dbManager.db) {
                try {
                    const data = dbManager.db.export();
                    const buffer = Array.from(data);
                    localStorage.setItem('roklearn_database_backup', JSON.stringify(buffer));
                } catch (error) {
                    console.error('Auto-save error:', error);
                }
            }
        }, 30000); // Save every 30 seconds
    }
}

// Initialize database file handler
let dbFileHandler;
document.addEventListener('DOMContentLoaded', () => {
    dbFileHandler = new DatabaseFileHandler();
    dbFileHandler.startAutoSave();
});