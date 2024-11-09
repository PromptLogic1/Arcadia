# Arcadia Platform User Stories

## 🔑 Role-Based Access & States

### Guest (Not Logged In)
As a guest user, I can:
- Challenge Section:
  - [x] View public challenge descriptions
  - [x] View global leaderboards (basic vote sorting only)
  - [-] View and edit public boards (without saving)
      - [x] View boards
      - [ ] Temporarily edit boards
  - [x] See challenge difficulty ratings
  - [x] Basic search functionality
  - [x] Cannot create boards (redirected to login)
  - [x] Cannot save or bookmark boards (redirected to login)
  - [x] Cannot vote on boards (redirected to login)

### Authenticated User
As a logged-in user, I inherit guest permissions and can also:
- Challenge Features:
  - [x] Create new bingo boards
  - [x] Save and bookmark boards
  - [x] Vote on boards
  - [ ] Save edited versions of public boards as personal copies
  - [ ] Manage personal board collection
  - [ ] Track personal progress (to be implemented)
  - [ ] Basic leaderboard participation (to be implemented)
  - [ ] Rate challenges (to be implemented)
  - [ ] Basic achievement system (to be implemented)

### Future Premium Features (To be implemented later):
- [ ] Custom board themes
- [ ] Advanced analytics
- [ ] Private boards
- [ ] Team features
- [ ] Tournament mode
- [ ] Custom win conditions
- [ ] Extended board sizes
- [ ] Priority support