# YapGenius Requirements

## 1. Authentication

As a new user
I want to create an account
So that I can access the messaging platform
- [x] Can register with email and password
- [x] Get feedback on password strength
- [x] Get notified of duplicate email/username

As a registered user
I want to log in to my account
So that I can access my messages and channels
- [x] Can log in with email/username and password
- [x] Stay logged in across browser sessions
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

## 3. Channel/DM Organization

As a user
I want to create and manage channels
So that I can organize conversations
- [x] Can create public channels
- [x] Can set channel names and descriptions
- [x] Can invite others to channels
- [x] Can see member list
- [x] Can create private channels

As a user
I want to search and join public channels
So that I can find new conversations
- [x] Can search channels by name
- [x] Can see channel descriptions
- [x] Can join public channels
- [x] Can leave channels

## 4. Direct Messages

As a user
I want to start direct messages
So that I can have private conversations
- [x] Can search for users to DM
- [x] Can start DM with one or more users
- [x] Can add people to existing DM
- [x] Can leave DM conversations
- [x] DMs appear in sidebar

As a user
I want to organize my channels/DMs
So that I can easily find conversations
- [x] Can archive channels
- [x] Can set channel description
- [x] Can edit channel description and name
- [x] Can mark channels as favorites

## 5. User Presence & Status

As a user
I want to set my status
So others know my availability
- [x] Can set status (online, away, offline)
- [x] Can set custom status message
- [x] Status shows in DM list
- [x] Status updates in real-time
- [x] Status updates itself periodically when app is open

As a user
I want to see others' presence
So I know who's available
- [x] See online status in real-time
- [x] See when users become active/inactive
- [x] See last active time for offline users

## 6. File Uploads

As a user
I want to share files
So that I can collaborate effectively
- [x] Can upload files up to 50MB
- [x] Can see upload progress
- [x] Can cancel uploads
- [x] Can download shared files
- [x] Can preview images and PDFs
- [x] Get warning for large files
- [x] See file metadata (size, type)

## 7. Profile

As a user
I want to create a profile
So that I can be identified by others
- [x] Can set a profile picture
- [x] Can set a display name
- [x] Can set a status message
- [x] Am prompted to set a profile picture and display name on signup

## 8. Thread Support

As a user
I want to create message threads
So I can organize detailed discussions
- [x] Can start thread from any message
- [x] Can reply in threads
- [x] Can see thread participant count
- [x] Can see thread reply count

As a user
I want to navigate threads
So I can follow conversations easily
- [x] Can see thread context
- [x] Can see unread indicators for threads
- [x] Can return to main channel view

## 9. System Messages
- [x] Can see when users join conversations
- [x] Can see when users leave conversations

## 10. Emoji Reactions

As a user
I want to react to messages
So I can respond quickly and expressively
- [x] Can add emoji reactions
- [x] Can remove my reactions
- [x] Can see who reacted
- [x] Can see reaction counts
- [x] Reactions update in real-time
- [x] Can see most used reactions first
- [x] Can search emoji picker

## 11. Pagination

As a user
I want to load earlier messages
So that I can stay updated on conversations
- [ ] can load earlier messages
- [ ] can skip to the newest message of a channel
- [ ] can build urls that link to specific messages
- [ ] Can share message links
- [ ] Can share thread links


## 12. Read State and Notifications

As a user
I want to see unread indicators
So that I can know what I have not read
- [x] Can see unread indicators
- [x] Can sort channels by activity
- [x] Can mute channels/DMs

As a user
I want to receive notifications
So that I can stay updated on conversations
- [ ] can receive notifications for new DMs
- [ ] can receive notifications for new threads
- [ ] can receive notifications for new reactions
- [ ] can receive notifications for new @'s
- [ ] can turn on notifications for selected channels
- [ ] Get notifications for thread replies


## 13. Search

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

## 14. Email + Account Security

As a admin, 
i want users to be verified
so that I can ensure the integrity of the platform
- [ ] can confirm email address after signup
- [ ] can request password reset

## 101. Enhancements

-[x] Send message on enter (DM)
-[x] Send message on enter (Channel)

## 102. Fixes

-[x] fix the position of the '#' in channel name when there is a description set
-[x] Invalid channel names are rejected ('new' etc)
-[x] lock icon on private channels
-[x] send image without text
-[x] send file without text
-[X] SSE for Channels
-[x] remove logs
-[x] clickable users names in user search
-[ ] fix error msgs
-[ ] optimize channel load time (important because it blocks all dropdown uis)
-[ ] buggy search results

## 15. RAG Chat Assistant (Yappy)

- [ ] Add search bar component to DMs and channel views
- [ ] Create permanent virtual user "Yappy" in DM list
- [ ] Implement redirect to Yappy chat when search is submitted
- [ ] Auto-send user's search query as a message in Yappy chat
- [ ] Display Yappy's response using /search endpoint results as a message

The RAG assistant should:
- Appear as a regular DM conversation
- Process search queries as natural chat messages
- Provide context-aware responses from chat history
- Support both simple and fusion search strategies

