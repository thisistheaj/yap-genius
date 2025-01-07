# YapGenius Requirements

## 1. Authentication

As a new user
I want to create an account
So that I can access the messaging platform
- [x] Can register with email and password
- [ ] Get feedback on password strength
- [ ] Get notified of duplicate email/username

As a registered user
I want to log in to my account
So that I can access my messages and channels
- [x] Can log in with email/username and password
- [x] Stay logged in across browser sessions
- [ ] Can request password reset
- [x] Can log out from current session

## 2. Real-time Messaging

As a user
I want to send messages
So that I can communicate with others
- [x] Can send text messages
- [x] See messages appear immediately
- [x] Can edit my messages
- [x] Can delete my messages
- [x] See "edited" indicator on edited messages
- [x] See delivery confirmation

As a user
I want to receive messages
So that I can stay updated on conversations
- [x] See new messages in real-time
- [x] See message timestamps
- [x] Messages persist after refresh
- [x] Can copy message content
- [ ] Can share message links

## 3. Channel/DM Organization

As a user
I want to create and manage channels
So that I can organize conversations
- [x] Can create public channels
- [x] Can set channel names and descriptions
- [x] Can invite others to channels
- [x] Can see member list
- [ ] Can create private channels **

As a user
I want to search and join public channels
So that I can find new conversations
- [x] Can search channels by name
- [x] Can see channel descriptions
- [x] Can join public channels
- [x] Can leave channels

As a user
I want to start direct messages
So that I can have private conversations
- [ ] Can search for users to DM
- [ ] Can start DM with one or more users
- [ ] Can add people to existing DM
- [ ] Can leave DM conversations
- [ ] Can see when others leave/join
- [x] DMs appear in sidebar

As a user
I want to organize my channels/DMs
So that I can easily find conversations
- [x] Can archive channels
- [x] Can set channel description
- [x] Can edit channel description and name
- [x] Can mark channels as favorites
- [ ] Can see unread indicators
- [ ] Can sort channels by activity
- [ ] Can mute channels/DMs

## 4. File Sharing

As a user
I want to share files
So that I can collaborate effectively
- [ ] Can upload files up to 50MB
- [ ] Can see upload progress
- [ ] Can cancel uploads
- [ ] Can download shared files
- [ ] Can preview images and PDFs
- [ ] Get warning for large files
- [ ] See file metadata (size, type)

## 5. User Presence & Status

As a user
I want to set my status
So others know my availability
- [ ] Can set status (online, away, offline)
- [ ] Can set custom status message
- [ ] Can set status duration
- [ ] Status shows in member lists
- [ ] Status shows in DM list
- [ ] Status updates in real-time

As a user
I want to see others' presence
So I know who's available
- [ ] See online status in real-time
- [ ] See when users become active/inactive
- [ ] See last active time for offline users
- [ ] See status in message headers
- [ ] See status in member lists

## 6. Thread Support

As a user
I want to create message threads
So I can organize detailed discussions
- [ ] Can start thread from any message
- [ ] Can reply in threads
- [ ] Can see thread participant count
- [ ] Can see thread reply count
- [ ] Get notifications for thread replies
- [ ] Can mute specific threads
- [ ] Can follow threads I'm interested in

As a user
I want to navigate threads
So I can follow conversations easily
- [ ] Can switch between threads
- [ ] Can see thread context
- [ ] Can collapse/expand threads
- [ ] Can see unread indicators for threads
- [ ] Can return to main channel view
- [ ] Can share thread links

## 7. Emoji Reactions

As a user
I want to react to messages
So I can respond quickly and expressively
- [ ] Can add emoji reactions
- [ ] Can remove my reactions
- [ ] Can see who reacted
- [ ] Can see reaction counts
- [ ] Reactions update in real-time
- [ ] Can see most used reactions first
- [ ] Can search emoji picker

## 8. Search

As a user
I want to search content
So that I can find past information
- [ ] Can search message content
- [ ] Can search by sender
- [ ] Can search by date range
- [ ] Can search file names
- [ ] Can filter by channel
- [ ] Can relevant search snippets
- [ ] Can sort search results