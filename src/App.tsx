import React, { useState, useRef } from 'react';
import { FolderOpen, Play, CheckCircle, XCircle, Loader2, FileAudio, ArrowRight, AlertTriangle } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

interface FileTask {
  file: File;
  parentHandle: FileSystemDirectoryHandle;
  status: 'pending' | 'converting' | 'done' | 'error' | 'skipped';
  progress: number;
  message?: string;
  outputName: string;
}

export default function App() {
  const [tasks, setTasks] = useState<FileTask[]>([]);
  const [isConverting, setIsConverting] = useState(false);
  const ffmpegRef = useRef<FFmpeg | null>(null);

  // Detect if the app is running in an iframe
  const isIframe = window !== window.top;

  const handleSelectInput = async () => {
    try {
      // Revert to File System Access API to get directory write permissions.
      // Mode 'readwrite' explicitly asks the user for permission to write files back to this folder.
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      const newTasks: FileTask[] = [];

      async function scanDirectory(currentDirHandle: FileSystemDirectoryHandle) {
        for await (const entry of currentDirHandle.values()) {
          if (entry.kind === 'file' && entry.name.toLowerCase().endsWith('.m4a')) {
            const file = await entry.getFile();
            newTasks.push({
              file,
              parentHandle: currentDirHandle,
              status: 'pending',
              progress: 0,
              outputName: entry.name.replace(/\.m4a$/i, '.mp3')
            });
          } else if (entry.kind === 'directory') {
            await scanDirectory(entry);
          }
        }
      }

      await scanDirectory(dirHandle);
      setTasks(newTasks);
    } catch (err) {
      console.error('Error selecting directory:', err);
    }
  };

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    
    const ffmpeg = new FFmpeg();
    // Use ESM version and explicitly provide workerURL for multi-threading
    const baseURL = 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm';
    await ffmpeg.load({
      coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
      wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      workerURL: await toBlobURL(`${baseURL}/ffmpeg-core.worker.js`, 'text/javascript'),
    });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const startConversion = async () => {
    if (tasks.length === 0) return;
    setIsConverting(true);

    try {
      const ffmpeg = await loadFFmpeg();
      
      setTasks(prev => prev.map(t => ({ ...t, status: 'pending', progress: 0, message: '' })));

      for (let i = 0; i < tasks.length; i++) {
        const task = tasks[i];
        
        setTasks(prev => {
          const newTasks = [...prev];
          newTasks[i] = { ...newTasks[i], status: 'converting', progress: 0 };
          return newTasks;
        });

        try {
          const inputFileName = 'input.m4a';
          const outputFileName = 'output.mp3';

          await ffmpeg.writeFile(inputFileName, await fetchFile(task.file));

          const progressHandler = ({ progress }: { progress: number }) => {
            setTasks(prev => {
              const newTasks = [...prev];
              newTasks[i] = { ...newTasks[i], progress: Math.round(progress * 100) };
              return newTasks;
            });
          };

          ffmpeg.on('progress', progressHandler);

          // Convert to MP3
          await ffmpeg.exec(['-i', inputFileName, '-b:a', '192k', outputFileName]);

          const data = await ffmpeg.readFile(outputFileName);
          const outputBlob = new Blob([data], { type: 'audio/mpeg' });

          // Auto-save back to the correct original folder
          try {
            const outputFileHandle = await task.parentHandle.getFileHandle(task.outputName, { create: true });
            const writable = await outputFileHandle.createWritable();
            await writable.write(outputBlob);
            await writable.close();
          } catch (saveErr) {
            console.error('Auto-save error:', saveErr);
            throw new Error("Không thể lưu file (Thiếu quyền truy cập)");
          }

          // Cleanup
          await ffmpeg.deleteFile(inputFileName);
          await ffmpeg.deleteFile(outputFileName);
          ffmpeg.off('progress', progressHandler);

          setTasks(prev => {
            const newTasks = [...prev];
            newTasks[i] = { ...newTasks[i], status: 'done', progress: 100, message: 'Đã lưu tự động' };
            return newTasks;
          });
        } catch (err: any) {
          console.error(`Error converting ${task.file.name}:`, err);
          setTasks(prev => {
            const newTasks = [...prev];
            newTasks[i] = { ...newTasks[i], status: 'error', message: err.message || 'Lỗi convert' };
            return newTasks;
          });
        }
      }
    } catch (err) {
      console.error('FFmpeg load error:', err);
      alert('Không thể tải bộ máy FFmpeg. Vui lòng kiểm tra lại mạng internet.');
    } finally {
      setIsConverting(false);
    }
  };

  const completedCount = tasks.filter(t => t.status === 'done' || t.status === 'skipped').length;
  const totalProgress = tasks.length > 0 
    ? Math.round((tasks.reduce((acc, t) => acc + (t.status === 'done' || t.status === 'skipped' ? 100 : t.progress), 0)) / tasks.length) 
    : 0;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 p-8 font-sans">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">M4A to MP3 Converter</h1>
          <p className="text-slate-500">Convert xong tự động lưu lại vào đúng folder cũ. Nhanh chóng, bảo mật.</p>
        </div>

        {isIframe && (
          <div className="bg-amber-100 border border-amber-300 text-amber-900 p-5 rounded-2xl flex flex-col md:flex-row items-center gap-4 text-left shadow-sm">
            <AlertTriangle className="w-10 h-10 shrink-0 text-amber-600" />
            <div className="flex-1">
              <h3 className="font-bold text-lg">Cần mở trong thẻ mới để cấp quyền lưu file!</h3>
              <p className="text-sm mt-1">Trình duyệt không cho phép quyền tự động lưu file về máy khi chạy bên trong cửa sổ xem trước này. Để tính năng <b>tự động ghi file đè vào thư mục cũ</b> hoạt động, vui lòng nhấn nút bên dưới.</p>
            </div>
            <a 
              href={window.location.href} 
              target="_blank" 
              rel="noreferrer" 
              className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl whitespace-nowrap shadow-sm transition-colors text-center"
            >
              Mở ứng dụng ở thẻ mới
            </a>
          </div>
        )}

        <div className="flex justify-center">
          <button
            onClick={handleSelectInput}
            disabled={isIframe}
            className="flex items-center justify-center gap-3 p-8 bg-white border-2 border-dashed border-slate-300 rounded-2xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors group w-full max-w-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FolderOpen className="w-8 h-8 text-slate-400 group-hover:text-indigo-500" />
            <div className="text-left">
              <div className="font-semibold text-lg text-slate-700 group-hover:text-indigo-700">Chọn Thư Mục</div>
              <div className="text-slate-500">Ứng dụng sẽ tìm các file .m4a và lưu .mp3 tại đây</div>
            </div>
          </button>
        </div>

        {tasks.length > 0 && !isIframe && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50 flex-wrap gap-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-800">Danh sách File ({tasks.length})</h2>
                <p className="text-sm text-slate-500">Gồm {tasks.length} file .m4a tìm thấy trong thư mục.</p>
              </div>
              <button
                onClick={startConversion}
                disabled={isConverting}
                className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 text-white font-medium rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
              >
                {isConverting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
                {isConverting ? 'Đang convert...' : 'Bắt đầu Convert'}
              </button>
            </div>

            {isConverting && (
              <div className="p-6 border-b border-slate-200 bg-indigo-50/50">
                <div className="flex justify-between text-sm font-medium text-indigo-900 mb-2">
                  <span>Tiến trình tổng:</span>
                  <span>{completedCount} / {tasks.length} files</span>
                </div>
                <div className="w-full bg-indigo-200/50 rounded-full h-3 overflow-hidden">
                  <div 
                    className="bg-indigo-600 h-3 rounded-full transition-all duration-300 ease-out" 
                    style={{ width: `${totalProgress}%` }}
                  ></div>
                </div>
              </div>
            )}

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {tasks.map((task, i) => (
                <div key={i} className="p-4 hover:bg-slate-50 transition-colors flex items-center gap-4">
                  <div className="p-2 bg-slate-100 rounded-lg text-slate-500 shrink-0">
                    <FileAudio className="w-5 h-5" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-slate-700 truncate pr-4">
                        {task.file.name}
                      </p>
                      <div className="flex items-center gap-2 shrink-0">
                        {task.status === 'pending' && <span className="text-xs font-medium text-slate-400">Đang chờ</span>}
                        {task.status === 'converting' && <span className="text-xs font-medium text-indigo-600">{task.progress}%</span>}
                        {task.status === 'done' && <span className="text-xs font-medium text-emerald-600 flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Hoàn thành</span>}
                        {task.status === 'skipped' && <span className="text-xs font-medium text-amber-600 flex items-center gap-1"><ArrowRight className="w-3.5 h-3.5" /> Bỏ qua</span>}
                        {task.status === 'error' && <span className="text-xs font-medium text-red-600 flex items-center gap-1"><XCircle className="w-3.5 h-3.5" /> {task.message}</span>}
                      </div>
                    </div>
                    
                    {(task.status === 'converting' || task.status === 'pending') && (
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div 
                          className={`h-1.5 rounded-full transition-all duration-300 ${task.status === 'converting' ? 'bg-indigo-500' : 'bg-slate-200'}`}
                          style={{ width: `${task.progress}%` }}
                        ></div>
                      </div>
                    )}
                    
                    {task.message && task.status === 'done' && (
                      <p className="text-xs mt-1 text-emerald-600 font-medium">
                        {task.message}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
