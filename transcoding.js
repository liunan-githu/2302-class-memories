const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');
const ffprobeStatic = require('ffprobe-static');
const path = require('path');
const fs = require('fs');

if (ffmpegStatic) {
  ffmpeg.setFfmpegPath(ffmpegStatic);
}

if (ffprobeStatic && ffprobeStatic.path && fs.existsSync(ffprobeStatic.path)) {
  ffmpeg.setFfprobePath(ffprobeStatic.path);
}

const QUALITY_PRESETS = {
  '360p': { width: 640, height: 360, videoBitrate: '800k', audioBitrate: '96k', label: '360p 流畅', maxFps: 30 },
  '720p': { width: 1280, height: 720, videoBitrate: '2500k', audioBitrate: '128k', label: '720p 高清', maxFps: 30 },
  '1080p': { width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k', label: '1080p 超清', maxFps: 30 },
  '4k': { width: 3840, height: 2160, videoBitrate: '20000k', audioBitrate: '256k', label: '4K 超高清' }
};

const QUALITY_ORDER = ['360p', '720p', '1080p', '4k'];

const activeTranscodes = new Map();
const recentTranscodes = [];
const MAX_RECENT = 20;

function getActiveTranscodes() {
  return Array.from(activeTranscodes.values());
}

function getRecentTranscodes() {
  return recentTranscodes.slice(0, MAX_RECENT);
}

function addRecentTranscode(entry) {
  recentTranscodes.unshift(entry);
  if (recentTranscodes.length > MAX_RECENT) {
    recentTranscodes.length = MAX_RECENT;
  }
}

function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      if (!videoStream) return reject(new Error('No video stream found'));
      resolve({
        width: videoStream.width,
        height: videoStream.height,
        fps: (() => {
          const [num, den] = (videoStream.r_frame_rate || '30/1').split('/').map(Number);
          return den ? num / den : 30;
        })(),
        duration: parseFloat(metadata.format.duration) || 0,
        bitrate: parseInt(metadata.format.bit_rate) || 0,
        codec: videoStream.codec_name,
        size: metadata.format.size || 0
      });
    });
  });
}

function verifyTranscodedFile(filePath, sourceDuration) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(new Error(`转码后文件验证失败: ${err.message}`));
      const outputDuration = parseFloat(metadata.format.duration) || 0;
      if (outputDuration === 0) return reject(new Error('转码后文件时长为 0'));
      const diff = Math.abs(outputDuration - sourceDuration);
      const ratio = diff / sourceDuration;
      if (ratio > 0.2) {
        return reject(new Error(`转码后文件时长 (${outputDuration.toFixed(2)}s) 与源文件时长 (${sourceDuration.toFixed(2)}s) 差异过大 (${(ratio * 100).toFixed(1)}%)`));
      }
      resolve();
    });
  });
}

function transcodeVideo(inputPath, outputDir, videoId, targetQuality, onProgress, sourceInfo = null) {
  return new Promise((resolve, reject) => {
    const preset = QUALITY_PRESETS[targetQuality];
    if (!preset) return reject(new Error(`Unknown quality: ${targetQuality}`));

    const outputFilename = `${videoId}_${targetQuality}.mp4`;
    const outputPath = path.join(outputDir, outputFilename);

    if (fs.existsSync(outputPath)) {
      return resolve({
        quality: targetQuality,
        filename: outputFilename,
        width: preset.width,
        height: preset.height,
        label: preset.label,
        status: 'completed',
        size: fs.statSync(outputPath).size
      });
    }

    const targetFps = preset.maxFps ? Math.min(preset.maxFps, (sourceInfo && sourceInfo.fps) || preset.maxFps) : undefined;
    const command = ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate(preset.videoBitrate)
      .audioBitrate(preset.audioBitrate)
      .outputOptions([
        '-preset', 'fast',
        '-movflags', '+faststart',
        '-pix_fmt', 'yuv420p',
        '-maxrate', preset.videoBitrate,
        '-bufsize', (parseInt(preset.videoBitrate) * 2) + 'k',
        '-vf', `scale=${preset.width}:-2${targetFps ? `,fps=${targetFps}` : ''}`
      ])
      .output(outputPath);

    const sourceDuration = (sourceInfo && sourceInfo.duration) || 0;
    const timeoutMs = Math.max((sourceDuration + 300) * 1000, 30 * 60 * 1000);
    let timeoutHandle = setTimeout(() => {
      command.kill('SIGKILL');
      reject(new Error(`转码超时 (${targetQuality})`));
    }, timeoutMs);

    let stderrLog = '';

    command.on('stderr', (line) => {
      stderrLog += line + '\n';
    });

    command.on('progress', (progress) => {
      if (onProgress) {
        onProgress({
          quality: targetQuality,
          progress: progress.percent || 0,
          status: 'processing',
          timemark: progress.timemark
        });
      }
    });

    command.on('end', async () => {
      clearTimeout(timeoutHandle);
      try {
        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size === 0) {
          throw new Error(`转码输出文件不存在或为空`);
        }
        if (sourceInfo && sourceInfo.duration) {
          await verifyTranscodedFile(outputPath, sourceInfo.duration);
        }
        const stat = fs.statSync(outputPath);
        resolve({
          quality: targetQuality,
          filename: outputFilename,
          width: preset.width,
          height: preset.height,
          label: preset.label,
          status: 'completed',
          size: stat.size
        });
      } catch (verifyErr) {
        if (fs.existsSync(outputPath)) {
          try { fs.unlinkSync(outputPath); } catch (_) {}
        }
        reject(verifyErr);
      }
    });

    command.on('error', (err) => {
      clearTimeout(timeoutHandle);
      console.error(`ffmpeg stderr for ${targetQuality}:`, stderrLog);
      if (fs.existsSync(outputPath)) {
        try { fs.unlinkSync(outputPath); } catch (_) {}
      }
      reject(err);
    });

    command.run();
  });
}

function updateOverallProgress(trackId, completedCount, totalQualities, currentProgress) {
  const weight = 1 / totalQualities;
  const overall = (completedCount * weight * 100) + (weight * currentProgress);
  const entry = activeTranscodes.get(trackId);
  if (entry) {
    entry.progress = Math.round(overall);
  }
}

async function transcodeAllQualities(inputPath, outputDir, videoId, onProgress, options = {}) {
  const results = {};
  const videoTitle = options.title || `视频 ${videoId}`;
  const trackId = videoId;

  activeTranscodes.set(trackId, {
    videoId,
    title: videoTitle,
    startedAt: new Date().toISOString(),
    progress: 0,
    currentQuality: null,
    status: 'preparing',
    qualities: {}
  });

  let info = null;
  try {
    info = await getVideoInfo(inputPath);
    results.sourceInfo = info;
  } catch (err) {
    console.error('获取视频信息失败:', err.message);
    console.log('使用默认预设(1080p)进行转码');
    info = { height: 1080, width: 1920, fps: 30, duration: 0, bitrate: 0, codec: 'unknown', size: 0 };
  }

  const targetQualities = QUALITY_ORDER.filter(q => {
    if (q === '4k') return false;
    const preset = QUALITY_PRESETS[q];
    return preset.height <= info.height;
  });

  if (targetQualities.length === 0) {
    activeTranscodes.delete(trackId);
    addRecentTranscode({ videoId, title: videoTitle, startedAt: activeTranscodes.get(trackId)?.startedAt || new Date().toISOString(), finishedAt: new Date().toISOString(), status: 'skipped', message: '源视频分辨率较低，无需转码' });
    if (onProgress) {
      onProgress({ quality: 'all', progress: 100, status: 'skipped', message: '源视频分辨率较低，无需转码' });
    }
    return { results, sourceInfo: info };
  }

  const totalQualities = targetQualities.length;
  let completedCount = 0;

  for (const quality of targetQualities) {
    try {
      const entry = activeTranscodes.get(trackId);
      if (entry) {
        entry.currentQuality = quality;
        entry.status = 'transcoding';
      }
      updateOverallProgress(trackId, completedCount, totalQualities, 0);

      if (onProgress) {
        onProgress({ quality, progress: 0, status: 'starting' });
      }

      const wrappedOnProgress = (progress) => {
        if (onProgress) {
          onProgress(progress);
        }
        if (progress.quality === quality) {
          const entry = activeTranscodes.get(trackId);
          if (entry) {
            entry.qualities = entry.qualities || {};
            entry.qualities[quality] = progress.percent || 0;
          }
          updateOverallProgress(trackId, completedCount, totalQualities, progress.percent || 0);
        }
      };

      const result = await transcodeVideo(inputPath, outputDir, videoId, quality, wrappedOnProgress, info);
      results[quality] = result;
      const entryAfterQuality = activeTranscodes.get(trackId);
      if (entryAfterQuality) {
        entryAfterQuality.qualities = entryAfterQuality.qualities || {};
        entryAfterQuality.qualities[quality] = 100;
      }
      completedCount++;
      updateOverallProgress(trackId, completedCount, totalQualities, 100);

      if (onProgress) {
        onProgress({ quality, progress: 100, status: 'completed' });
      }
    } catch (err) {
      console.error(`转码 ${quality} 失败:`, err.message);
      results[quality] = { quality, status: 'failed', error: err.message };
      completedCount++;
      updateOverallProgress(trackId, completedCount, totalQualities, 100);
      if (onProgress) {
        onProgress({ quality, progress: 0, status: 'failed', error: err.message });
      }
    }
  }

  const completedEntry = activeTranscodes.get(trackId);
  const completedStartedAt = completedEntry ? completedEntry.startedAt : new Date().toISOString();
  activeTranscodes.delete(trackId);
  addRecentTranscode({ videoId, title: videoTitle, startedAt: completedStartedAt, finishedAt: new Date().toISOString(), status: 'completed', qualities: Object.keys(results).filter(k => k !== 'sourceInfo') });

  return { results, sourceInfo: results.sourceInfo || info };
}

function getAvailableQualities(videoId, uploadsDir, originalFilename = null) {
  const qualities = [];

  for (const [quality, preset] of Object.entries(QUALITY_PRESETS)) {
    const filename = `${videoId}_${quality}.mp4`;
    const filePath = path.join(uploadsDir, filename);
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      qualities.push({
        quality,
        filename,
        width: preset.width,
        height: preset.height,
        label: preset.label,
        size: stat.size,
        status: 'completed'
      });
    }
  }

  return qualities;
}

module.exports = {
  QUALITY_PRESETS,
  QUALITY_ORDER,
  getVideoInfo,
  transcodeVideo,
  transcodeAllQualities,
  getAvailableQualities,
  getActiveTranscodes,
  getRecentTranscodes
};