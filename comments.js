// Create web server
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const axios = require('axios');

// Create express app
const app = express();
// Use middlewares
app.use(bodyParser.json());
app.use(cors());

// Create comments object
const commentsByPostId = {};

// Create endpoint for comments
app.get('/posts/:id/comments', (req, res) => {
  res.send(commentsByPostId[req.params.id] || []);
});

// Create endpoint for comments
app.post('/posts/:id/comments', async (req, res) => {
  // Generate random id
  const commentId = require('crypto').randomBytes(4).toString('hex');
  // Get content from request
  const { content } = req.body;
  // Get comments from postId
  const comments = commentsByPostId[req.params.id] || [];
  // Add comment to comments array
  comments.push({ id: commentId, content, status: 'pending' });
  // Update comments
  commentsByPostId[req.params.id] = comments;
  // Send event to event-bus
  await axios.post('http://event-bus-srv:4005/events', {
    type: 'CommentCreated',
    data: {
      id: commentId,
      content,
      postId: req.params.id,
      status: 'pending',
    },
  });
  res.status(201).send(comments);
});

// Create endpoint for events
app.post('/events', async (req, res) => {
  console.log('Event received:', req.body.type);
  const { type, data } = req.body;
  if (type === 'CommentModerated') {
    // Get comments from postId
    const comments = commentsByPostId[data.postId];
    // Find comment
    const comment = comments.find((comment) => {
      return comment.id === data.id;
    });
    // Update status
    comment.status = data.status;
    // Send event to event-bus
    await axios.post('http://event-bus-srv:4005/events', {
      type: 'CommentUpdated',
      data: {
        id: data.id,
        content: data.content,
        postId: data.postId,
        status: data.status,
      },
    });
  }
  res.send({});
});

// Start server
app.listen(4001, () =>
  console.log('Comments service listening on port 4001')
);