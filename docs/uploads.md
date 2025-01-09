# File Upload System

## Design Goals
- Simple, centralized upload handling
- Public file access via URL
- Minimal dependencies (local file storage)
- Clean separation of concerns
- Remix-friendly implementation

## Architecture Decision Record

### 1. Local File Storage
**Decision:** Store files directly on the server's file system instead of using S3 or similar services.

**Rationale:**
- Simpler implementation
- Leverages existing compute volume
- Reduces external dependencies
- Sufficient for current scale requirements

### 2. Single Upload Endpoint
**Decision:** Implement a single `/api/uploads` endpoint that handles all file uploads application-wide.

**Rationale:**
- Centralizes upload logic
- Makes it easy to modify upload behavior globally
- Simplifies permission checks
- Returns consistent file metadata

### 3. Public File Access
**Decision:** Serve files publicly via `/uploads/{filename}` URLs.

**Rationale:**
- Simpler permission model
- Works like a CDN
- Easy to cache at the edge
- Predictable URLs for frontend use

### 4. Database Schema
```prisma
model File {
  id        String   @id @default(cuid())
  name      String   // Original filename
  url       String   // Public URL (/uploads/{id}-{name})
  size      Int
  mimeType  String
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  createdAt DateTime @default(now())
}
```

**Rationale:**
- Tracks essential file metadata
- Links files to users
- Maintains upload history
- Enables file listing and management

## Implementation

### Upload Flow
1. Frontend sends file via multipart form data to `/api/uploads`
2. Server validates user authentication
3. File is saved to disk with unique ID-based filename
4. File metadata is stored in database
5. URL and metadata returned to client

### Example Usage

```typescript
// Upload component
<UploadButton 
  onUploadComplete={(file) => {
    // Use the returned file data
    console.log(file.url);
  }}
/>

// Displaying an uploaded image
<img src={file.url} alt={file.name} />
```

### File Organization

```
/uploads/
└── {id}-{originalFilename}
```

Files are stored flat in the uploads directory with ID-prefixed names to prevent collisions while preserving original filenames.

## Security Considerations

1. **Authentication**
   - All uploads require authenticated users
   - File ownership tracked in database

2. **File Access**
   - Files are public by design
   - No sensitive data should be uploaded
   - Consider implementing signed URLs if private files needed

3. **Storage Limits**
   - Monitor disk usage
   - Implement quota system if needed
   - Regular cleanup of unused files (future enhancement)

## Future Enhancements

1. **File Management**
   - Delete unused files
   - User storage quotas
   - File expiration

2. **Performance**
   - Image optimization
   - Preview generation
   - Edge caching

3. **Features**
   - Drag and drop uploads
   - Paste image support
   - Multiple file uploads

## Maintenance

### Backup Strategy
- Include `/uploads` directory in regular system backups
- Database contains all file metadata
- Consider periodic cleanup of orphaned files

### Monitoring
- Watch disk space usage
- Track upload failures
- Monitor file access patterns

## Migration Path

If we need to move to cloud storage in the future:
1. Create new storage adapter interface
2. Implement cloud provider adapter
3. Migrate existing files
4. Update URL generation
5. Keep file model structure

The current design makes this transition straightforward as all file references are through URLs and the database.