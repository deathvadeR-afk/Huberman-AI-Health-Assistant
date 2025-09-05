import express from 'express';
import transcriptController from '../controllers/transcriptController.js';

const router = express.Router();

/**
 * @route GET /api/transcripts/stats
 * @desc Get transcript statistics
 * @access Public
 */
router.get('/stats', transcriptController.getTranscriptStats);

/**
 * @route GET /api/transcripts/search
 * @desc Search transcripts
 * @access Public
 */
router.get('/search', transcriptController.searchTranscripts);

/**
 * @route GET /api/transcripts/:videoId
 * @desc Get transcript for a specific video
 * @access Public
 */
router.get('/:videoId', transcriptController.getVideoTranscript);

/**
 * @route GET /api/transcripts/:videoId/segments
 * @desc Get transcript segments for a video
 * @access Public
 */
router.get('/:videoId/segments', transcriptController.getVideoSegments);

export default router;