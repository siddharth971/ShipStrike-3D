// src/systems/friends.js
// Friends system for social connections

export class FriendRequest {
  constructor(senderId, receiverId) {
    this.senderId = senderId;
    this.receiverId = receiverId;
    this.createdAt = Date.now();
    this.status = 'pending'; // pending, accepted, rejected
  }
}

export class FriendsSystem {
  constructor() {
    this.friendships = new Map(); // "player1:player2" -> true (both directions)
    this.pendingRequests = new Map(); // "sender:receiver" -> FriendRequest
    this.blockedPlayers = new Map(); // "player1:player2" -> true
    this.playerFriends = new Map(); // playerId -> Set of friendIds
    this.playerRequests = new Map(); // playerId -> Set of request senders
  }

  /**
   * Send friend request
   */
  sendFriendRequest(senderId, receiverId) {
    // Validate
    if (senderId === receiverId) return { success: false, error: 'Cannot friend yourself' };
    
    const requestKey = `${senderId}:${receiverId}`;
    const reverseKey = `${receiverId}:${senderId}`;

    // Check if already friends
    const friendKey = this.getFriendKey(senderId, receiverId);
    if (this.friendships.has(friendKey)) {
      return { success: false, error: 'Already friends' };
    }

    // Check if blocked
    if (this.blockedPlayers.has(`${senderId}:${receiverId}`)) {
      return { success: false, error: 'Player blocked' };
    }

    // Check if blocked by other player
    if (this.blockedPlayers.has(reverseKey)) {
      return { success: false, error: 'You are blocked by this player' };
    }

    // Check if request already pending
    if (this.pendingRequests.has(requestKey)) {
      return { success: false, error: 'Friend request already sent' };
    }

    // Check if reverse request exists
    if (this.pendingRequests.has(reverseKey)) {
      return { success: false, error: 'This player has already sent you a request' };
    }

    // Create request
    const request = new FriendRequest(senderId, receiverId);
    this.pendingRequests.set(requestKey, request);

    // Add to receiver's pending requests
    let receiverRequests = this.playerRequests.get(receiverId);
    if (!receiverRequests) {
      receiverRequests = new Set();
      this.playerRequests.set(receiverId, receiverRequests);
    }
    receiverRequests.add(senderId);

    return {
      success: true,
      requestId: requestKey,
      message: 'Friend request sent'
    };
  }

  /**
   * Accept friend request
   */
  acceptFriendRequest(receiverId, senderId) {
    const requestKey = `${senderId}:${receiverId}`;
    const request = this.pendingRequests.get(requestKey);

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    // Create friendship
    const friendKey = this.getFriendKey(senderId, receiverId);
    this.friendships.set(friendKey, true);

    // Add to both players' friend lists
    this.addFriendToList(senderId, receiverId);
    this.addFriendToList(receiverId, senderId);

    // Remove request
    this.pendingRequests.delete(requestKey);
    const requests = this.playerRequests.get(receiverId);
    if (requests) {
      requests.delete(senderId);
    }

    return {
      success: true,
      message: 'Friend request accepted',
      newFriend: senderId
    };
  }

  /**
   * Reject friend request
   */
  rejectFriendRequest(receiverId, senderId) {
    const requestKey = `${senderId}:${receiverId}`;
    const request = this.pendingRequests.get(requestKey);

    if (!request) {
      return { success: false, error: 'Request not found' };
    }

    // Remove request
    this.pendingRequests.delete(requestKey);
    const requests = this.playerRequests.get(receiverId);
    if (requests) {
      requests.delete(senderId);
    }

    return {
      success: true,
      message: 'Friend request rejected'
    };
  }

  /**
   * Remove friend
   */
  removeFriend(playerId, friendId) {
    const friendKey = this.getFriendKey(playerId, friendId);
    const wasRemoved = this.friendships.delete(friendKey);

    if (wasRemoved) {
      this.removeFriendFromList(playerId, friendId);
      this.removeFriendFromList(friendId, playerId);
    }

    return {
      success: wasRemoved,
      message: wasRemoved ? 'Friend removed' : 'Friend not found'
    };
  }

  /**
   * Block player
   */
  blockPlayer(playerId, blockedId) {
    if (playerId === blockedId) return { success: false, error: 'Cannot block yourself' };

    const blockKey = `${playerId}:${blockedId}`;
    this.blockedPlayers.set(blockKey, true);

    // Remove friendship if exists
    const friendKey = this.getFriendKey(playerId, blockedId);
    if (this.friendships.has(friendKey)) {
      this.friendships.delete(friendKey);
      this.removeFriendFromList(playerId, blockedId);
      this.removeFriendFromList(blockedId, playerId);
    }

    // Cancel any pending requests both ways
    const requestKey1 = `${playerId}:${blockedId}`;
    const requestKey2 = `${blockedId}:${playerId}`;
    this.pendingRequests.delete(requestKey1);
    this.pendingRequests.delete(requestKey2);

    return { success: true, message: 'Player blocked' };
  }

  /**
   * Unblock player
   */
  unblockPlayer(playerId, blockedId) {
    const blockKey = `${playerId}:${blockedId}`;
    const wasRemoved = this.blockedPlayers.delete(blockKey);

    return {
      success: wasRemoved,
      message: wasRemoved ? 'Player unblocked' : 'Player not blocked'
    };
  }

  /**
   * Check if players are friends
   */
  areFriends(playerId1, playerId2) {
    const friendKey = this.getFriendKey(playerId1, playerId2);
    return this.friendships.has(friendKey);
  }

  /**
   * Get player's friends
   */
  getPlayerFriends(playerId) {
    const friends = this.playerFriends.get(playerId);
    return friends ? Array.from(friends) : [];
  }

  /**
   * Get player's pending requests
   */
  getPlayerPendingRequests(playerId) {
    const requests = this.playerRequests.get(playerId);
    return requests ? Array.from(requests) : [];
  }

  /**
   * Get all blocked players
   */
  getBlockedPlayers(playerId) {
    const blocked = [];
    this.blockedPlayers.forEach((_, key) => {
      if (key.startsWith(`${playerId}:`)) {
        const blockedId = key.split(':')[1];
        blocked.push(blockedId);
      }
    });
    return blocked;
  }

  /**
   * Get friend request details
   */
  getRequestDetails(senderId, receiverId) {
    const requestKey = `${senderId}:${receiverId}`;
    return this.pendingRequests.get(requestKey) || null;
  }

  /**
   * Private: Add friend to list
   */
  addFriendToList(playerId, friendId) {
    let friends = this.playerFriends.get(playerId);
    if (!friends) {
      friends = new Set();
      this.playerFriends.set(playerId, friends);
    }
    friends.add(friendId);
  }

  /**
   * Private: Remove friend from list
   */
  removeFriendFromList(playerId, friendId) {
    const friends = this.playerFriends.get(playerId);
    if (friends) {
      friends.delete(friendId);
    }
  }

  /**
   * Private: Get normalized friend key
   */
  getFriendKey(playerId1, playerId2) {
    const ids = [playerId1, playerId2].sort();
    return `${ids[0]}:${ids[1]}`;
  }

  /**
   * Get friend count
   */
  getFriendCount(playerId) {
    const friends = this.playerFriends.get(playerId);
    return friends ? friends.size : 0;
  }

  /**
   * Export data
   */
  exportData() {
    return {
      friendships: Object.fromEntries(Array.from(this.friendships.entries())),
      pendingRequests: Object.fromEntries(
        Array.from(this.pendingRequests.entries()).map(([k, v]) => [k, v.toJSON?.() || v])
      ),
      blockedPlayers: Object.fromEntries(Array.from(this.blockedPlayers.entries())),
      playerFriends: Object.fromEntries(
        Array.from(this.playerFriends.entries()).map(([k, v]) => [k, Array.from(v)])
      ),
      playerRequests: Object.fromEntries(
        Array.from(this.playerRequests.entries()).map(([k, v]) => [k, Array.from(v)])
      )
    };
  }

  /**
   * Import data
   */
  importData(data) {
    if (data.friendships) {
      Object.entries(data.friendships).forEach(([k, v]) => {
        this.friendships.set(k, v);
      });
    }
    if (data.pendingRequests) {
      Object.entries(data.pendingRequests).forEach(([k, v]) => {
        this.pendingRequests.set(k, v instanceof FriendRequest ? v : Object.assign(new FriendRequest(k.split(':')[0], k.split(':')[1]), v));
      });
    }
    if (data.blockedPlayers) {
      Object.entries(data.blockedPlayers).forEach(([k, v]) => {
        this.blockedPlayers.set(k, v);
      });
    }
    if (data.playerFriends) {
      Object.entries(data.playerFriends).forEach(([k, v]) => {
        this.playerFriends.set(k, new Set(v));
      });
    }
    if (data.playerRequests) {
      Object.entries(data.playerRequests).forEach(([k, v]) => {
        this.playerRequests.set(k, new Set(v));
      });
    }
  }

  /**
   * Clear all
   */
  clear() {
    this.friendships.clear();
    this.pendingRequests.clear();
    this.blockedPlayers.clear();
    this.playerFriends.clear();
    this.playerRequests.clear();
  }
}

export default FriendsSystem;
