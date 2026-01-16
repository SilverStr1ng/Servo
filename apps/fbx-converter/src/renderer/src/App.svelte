<script lang="ts">
  import { onMount } from 'svelte';
  import logo from './assets/logo.png';
  import { FileUp, Download, Settings, Loader2, CheckCircle2, AlertCircle, FolderOpen, Files, Plus, Trash2, ChevronDown, ChevronUp, XCircle } from 'lucide-svelte';

  interface FileItem {
    path: string;
    status: 'pending' | 'processing' | 'success' | 'error';
    error?: string;
  }

  let fileList: FileItem[] = [];
  $: pendingFiles = fileList.filter(f => f.status === 'pending');
  $: completedFiles = fileList.filter(f => f.status !== 'pending');
  
  let status: 'idle' | 'processing' | 'success' | 'error' = 'idle';
  let message = '';
  let progress = { current: 0, total: 0 };
  let customOutputDir = '';
  let abortRequested = false;
  let logoError = false;

  let showAdvanced = false;
  let options = {
    draco: true,
    dracoOptions: {
      method: 'edgebreaker' as 'edgebreaker' | 'sequential',
      compressionLevel: 7,
      quantizePositionBits: 14,
      quantizeNormalBits: 10,
      quantizeTexcoordBits: 12,
      quantizeColorBits: 8,
      quantizeGenericBits: 8
    },
    meshopt: true,
    ktx2: false,
    ktx2Options: {
      mode: 'uastc' as 'etc1s' | 'uastc',
      quality: 75,
      compression: 2,
      powerOfTwo: true
    }
  };

  async function handleSelectFiles() {
    const selectedFiles = await window.api.selectFile();
    if (selectedFiles && selectedFiles.length > 0) {
      const existingPaths = new Set(fileList.map(f => f.path));
      const newItems = selectedFiles
        .filter(p => !existingPaths.has(p))
        .map(p => ({ path: p, status: 'pending' as const }));
      fileList = [...fileList, ...newItems];
    }
  }

  async function handleSelectFolder() {
    const result = await window.api.selectFolder();
    if (result && result.length > 0) {
      const existingPaths = new Set(fileList.map(f => f.path));
      const newItems = result
        .filter(p => !existingPaths.has(p))
        .map(p => ({ path: p, status: 'pending' as const }));
      fileList = [...fileList, ...newItems];
    }
  }

  async function handleSelectOutputFolder() {
    const result = await window.api.selectOutputDirectory();
    if (result) {
      customOutputDir = result;
    }
  }

  function removeFile(path: string) {
    fileList = fileList.filter(f => f.path !== path);
  }

  function clearFiles() {
    fileList = [];
    status = 'idle';
  }

  function clearCompleted() {
    fileList = fileList.filter(f => f.status === 'pending');
  }

  async function handleConvert() {
    if (pendingFiles.length === 0) return;

    status = 'processing';
    abortRequested = false;
    progress = { current: 0, total: pendingFiles.length };
    
    // 我们只处理还处于 pending 状态的文件
    const toProcess = [...pendingFiles];

    for (const item of toProcess) {
      if (abortRequested) {
        message = '操作已中止';
        break;
      }

      const index = fileList.findIndex(f => f.path === item.path);
      fileList[index].status = 'processing';
      fileList = [...fileList]; // trigger update

      message = "正在处理: " + item.path.split(/[\\/]/).pop();
      try {
        const result = await window.api.convertFbx({
          inputPath: item.path,
          options,
          outputDir: customOutputDir || undefined
        });
        fileList[index].status = result.success ? 'success' : 'error';
        if (!result.success) fileList[index].error = result.error;
      } catch (e: any) {
        fileList[index].status = 'error';
        fileList[index].error = e.message;
      }
      fileList = [...fileList]; // trigger update
      progress.current++;
    }

    if (abortRequested) {
      status = 'idle';
    } else {
      const hasError = fileList.some(f => f.status === 'error');
      status = hasError ? 'error' : 'success';
      message = status === 'success' ? ("全部 " + progress.total + " 个文件转换成功！") : '部分文件转换失败';
    }
  }

  function openFolder(path: string) {
    window.api.openFolder(path);
  }
</script>

<main class="h-screen bg-zinc-950 text-zinc-100 flex flex-col overflow-hidden select-none">
  <!-- Custom Title Bar -->
  <header class="h-8 flex items-center justify-between bg-zinc-950 border-b border-zinc-900 px-4 shrink-0 drag-region">
    <div class="flex items-center gap-2 flex-1 h-full">
      {#if !logoError}
        <img src={logo} alt="" class="w-4 h-4 object-contain" on:error={() => logoError = true} />
      {/if}
      <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-tighter">FBX to glTF Library</span>
    </div>
    <!-- Windows controls space -->
    <div class="w-[140px] h-full no-drag"></div>
  </header>

  <div class="flex-1 p-6 flex flex-col gap-6 min-h-0">
    <header class="flex items-center justify-between shrink-0">
      <div class="flex items-center gap-3">
      <div class="p-2 bg-zinc-900 rounded-xl border border-zinc-800 shadow-inner">
        {#if !logoError}
          <img src={logo} alt="Logo" class="w-8 h-8 object-contain" on:error={() => logoError = true} />
        {:else}
          <Files class="w-8 h-8 text-blue-500" />
        {/if}
      </div>
      <div>
        <h1 class="text-2xl font-black bg-gradient-to-r from-white to-zinc-500 bg-clip-text text-transparent leading-tight">
          FBX to glTF Library
        </h1>
        <p class="text-[10px] text-zinc-500 font-medium tracking-wider uppercase opacity-70">集成 FBX2glTF 与 glTF-Transform 的转换工具</p>
      </div>
    </div>
    <div class="flex gap-2">
      <button
        on:click={handleSelectFiles}
        class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
        title="添加文件"
      >
        <Plus class="w-5 h-5" />
      </button>
      <button
        on:click={handleSelectFolder}
        class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-zinc-800 transition-colors"
        title="添加文件夹"
      >
        <FolderOpen class="w-5 h-5" />
      </button>
      <button
        on:click={clearFiles}
        class="p-2 bg-zinc-900 border border-zinc-800 rounded-lg hover:bg-red-950/30 hover:border-red-900/50 transition-colors text-zinc-500 hover:text-red-400"
        title="清空列表"
      >
        <Trash2 class="w-5 h-5" />
      </button>
    </div>
  </header>

  <div class="flex-1 flex gap-6 min-h-0">
    <!-- Left: File List -->
    <div class="flex-1 bg-zinc-900/30 border border-zinc-800 rounded-2xl flex flex-col min-h-0">
      <div class="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50 rounded-t-2xl shrink-0">
        <span class="text-sm font-bold flex items-center gap-2">
          <Files class="w-4 h-4 text-zinc-500" />
          待转换 ({pendingFiles.length})
          {#if completedFiles.length > 0}
            <span class="px-1.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px]">已完成 {completedFiles.length}</span>
          {/if}
        </span>
      </div>
      <div class="flex-1 overflow-y-auto p-2 space-y-4 custom-scrollbar">
        {#if pendingFiles.length > 0}
          <div class="space-y-1">
            {#each pendingFiles as file}
              <div class="group flex items-center gap-3 p-3 bg-zinc-900/50 hover:bg-zinc-800/50 rounded-xl transition-all border border-transparent hover:border-zinc-800">        
                <div class="w-8 h-8 rounded-lg bg-zinc-800 flex items-center justify-center text-[10px] font-bold text-zinc-500 uppercase">
                  {file.path.split('.').pop()}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate font-medium text-zinc-300">{file.path.split(/[\\/]/).pop()}</div>
                  <div class="text-[10px] text-zinc-600 truncate">{file.path}</div>
                </div>
                {#if file.status === 'processing'}
                  <Loader2 class="w-4 h-4 text-blue-500 animate-spin" />
                {:else}
                  <button
                    on:click={() => removeFile(file.path)}
                    class="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-500/10 hover:text-red-400 rounded-md transition-all"
                  >
                    <Trash2 class="w-4 h-4" />
                  </button>
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if completedFiles.length > 0}
          <div class="space-y-1">
            <div class="px-3 py-1 text-[10px] font-bold text-zinc-600 uppercase tracking-widest flex items-center gap-2">
              <span class="h-px flex-1 bg-zinc-800"></span>
              <span>最近处理完成</span>
              <button on:click={clearCompleted} class="text-zinc-500 hover:text-zinc-300 transition-colors bg-zinc-900 px-2 py-0.5 rounded border border-zinc-800">
                清空已完成
              </button>
              <span class="h-px flex-1 bg-zinc-800"></span>
            </div>
            {#each completedFiles.slice().reverse() as file}
              <div class="flex items-center gap-3 p-3 bg-zinc-950/30 rounded-xl border border-zinc-800/50 opacity-60">        
                <div class={"w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-bold uppercase " + (file.status === 'success' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500')}>
                  {file.status === 'success' ? 'OK' : 'ERR'}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="text-sm truncate font-medium text-zinc-400">{file.path.split(/[\\/]/).pop()}</div>
                  {#if file.error}
                    <div class="text-[10px] text-red-500/70 truncate">{file.error}</div>
                  {:else}
                    <div class="text-[10px] text-zinc-700 truncate">{file.path}</div>
                  {/if}
                </div>
                {#if file.status === 'success'}
                  <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                {:else}
                  <AlertCircle class="w-4 h-4 text-red-500" />
                {/if}
              </div>
            {/each}
          </div>
        {/if}

        {#if fileList.length === 0}
          <div class="h-full flex flex-col items-center justify-center text-zinc-600 space-y-4 pt-10">
            <FileUp class="w-12 h-12 stroke-1 opacity-20" />
            <p class="text-sm">拖入文件或点击上方按钮开始</p>
          </div>
        {/if}
      </div>
    </div>

    <!-- Right: Settings & Action -->
    <div class="w-80 flex flex-col gap-4 min-h-0 h-full">
      <div class="flex-1 bg-zinc-900/50 border border-zinc-800 rounded-2xl flex flex-col min-h-0 overflow-hidden">
        <div class="p-4 border-b border-zinc-800 bg-zinc-900/50 shrink-0">
          <h2 class="text-sm font-bold flex items-center gap-2">
            <Settings class="w-4 h-4 text-zinc-500" />
            全局优化设置
          </h2>
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar p-4 space-y-6">
          <!-- Output Path Section -->
          <div class="space-y-2 shrink-0">
            <span class="text-[10px] font-bold text-zinc-500 uppercase tracking-wider">输出目录</span>
            <div class="flex gap-2">
              <div class="flex-1 bg-zinc-950/50 border border-zinc-800 rounded-xl px-3 py-2 text-[10px] text-zinc-400 truncate leading-relaxed">
                {customOutputDir || '与源文件相同'}
              </div>
              <button
                on:click={handleSelectOutputFolder}
                class="p-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                title="更改输出目录"
              >
                <FolderOpen class="w-4 h-4" />
              </button>
              {#if customOutputDir}
                <button
                  on:click={() => customOutputDir = ''}
                  class="p-2 bg-zinc-800 border border-zinc-700 rounded-xl hover:bg-red-950/30 text-zinc-500 hover:text-red-400 transition-colors shrink-0"
                  title="重置"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              {/if}
            </div>
          </div>

          <div class="space-y-4">
            <label class="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">      
              <div class="flex flex-col">
                <span class="text-sm font-medium">Draco 压缩</span>
                <span class="text-[10px] text-zinc-500">网格几何数据压缩</span>
              </div>
              <input type="checkbox" id="draco-toggle" bind:checked={options.draco} class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0" />
            </label>

            {#if options.draco}
              <div class="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-3">
                <button
                  type="button"
                  on:click={() => showAdvanced = !showAdvanced}
                  class="w-full flex items-center justify-between text-[10px] font-bold text-zinc-500 uppercase tracking-wider"
                >
                  Draco 详细参数
                  {#if showAdvanced}<ChevronUp class="w-3 h-3" />{:else}<ChevronDown class="w-3 h-3" />{/if}
                </button>

                {#if showAdvanced}
                  <div class="space-y-4 pt-2 text-zinc-300">
                    <div class="space-y-1.5">
                      <label for="comp-level" class="flex justify-between text-[10px] text-zinc-400">
                        <span>压缩等级</span>
                        <span>{options.dracoOptions.compressionLevel}</span>
                      </label>
                      <input id="comp-level" type="range" min="0" max="10" bind:value={options.dracoOptions.compressionLevel} class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>

                    <div class="space-y-1.5">
                      <label for="pos-bits" class="flex justify-between text-[10px] text-zinc-400">
                        <span>位置量化位</span>
                        <span>{options.dracoOptions.quantizePositionBits}</span>
                      </label>
                      <input id="pos-bits" type="range" min="8" max="24" bind:value={options.dracoOptions.quantizePositionBits} class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600" />
                    </div>

                    <div class="grid grid-cols-2 gap-2">
                      <div class="space-y-1">
                        <label for="tex-bits" class="text-[10px] text-zinc-500">纹理量化</label>
                        <input id="tex-bits" type="number" bind:value={options.dracoOptions.quantizeTexcoordBits} class="w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 text-xs focus:outline-none focus:border-blue-600" />
                      </div>
                      <div class="space-y-1">
                        <label for="norm-bits" class="text-[10px] text-zinc-500">法线量化</label>
                        <input id="norm-bits" type="number" bind:value={options.dracoOptions.quantizeNormalBits} class="w-full bg-zinc-900 border border-zinc-800 rounded-md p-1.5 text-xs focus:outline-none focus:border-blue-600" />
                      </div>
                    </div>
                  </div>
                {/if}
              </div>
            {/if}

            <label class="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">      
              <div class="flex flex-col">
                <span class="text-sm font-medium">Meshopt 导出</span>
                <span class="text-[10px] text-zinc-500">极限传输与加载性能</span>
              </div>
              <input type="checkbox" id="meshopt-toggle" bind:checked={options.meshopt} class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0" />      
            </label>

            <label class="flex items-center justify-between p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">      
              <div class="flex flex-col">
                <span class="text-sm font-medium">KTX2 纹理压缩</span>
                <span class="text-[10px] text-zinc-500">GPU 纹理直接加载</span>
              </div>
              <input type="checkbox" id="ktx2-toggle" bind:checked={options.ktx2} class="w-4 h-4 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0" />
            </label>

            {#if options.ktx2}
              <div class="p-3 bg-zinc-950/50 border border-zinc-800 rounded-xl space-y-3">
                <div class="flex flex-col gap-2">
                  <span class="text-[10px] font-bold text-zinc-500 uppercase">压缩模式</span>
                  <div class="flex bg-zinc-900 rounded-lg p-1">
                    <button
                      on:click={() => options.ktx2Options.mode = 'uastc'}
                      class={"flex-1 py-1 text-[10px] rounded-md transition-all " + (options.ktx2Options.mode === 'uastc' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')}
                    >UASTC (高质量)</button>
                    <button
                      on:click={() => options.ktx2Options.mode = 'etc1s'}
                      class={"flex-1 py-1 text-[10px] rounded-md transition-all " + (options.ktx2Options.mode === 'etc1s' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-500 hover:text-zinc-300')}
                    >ETC1S (高压缩)</button>
                  </div>
                </div>

                <div class="space-y-1.5">
                  <label for="ktx-quality" class="flex justify-between text-[10px] text-zinc-400">
                    <span>质量 / 压缩级别</span>
                    <span>{options.ktx2Options.quality}</span>
                  </label>
                  <input id="ktx-quality" type="range"
                    min={options.ktx2Options.mode === 'uastc' ? 0 : 1}
                    max={options.ktx2Options.mode === 'uastc' ? 4 : 255}
                    bind:value={options.ktx2Options.quality}
                    class="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-blue-600"
                  />
                </div>

                <label class="flex items-center justify-between cursor-pointer">
                  <span class="text-[10px] text-zinc-500 uppercase font-bold">强制 2 的幂次</span>
                  <input type="checkbox" bind:checked={options.ktx2Options.powerOfTwo} class="w-3 h-3 rounded border-zinc-800 bg-zinc-900 text-blue-600 focus:ring-0" />       
                </label>
              </div>
            {/if}
          </div>
        </div>

        <div class="p-4 border-t border-zinc-800 bg-zinc-900/50 shrink-0">
          {#if status === 'processing'}
            <div class="space-y-3">
              <div class="h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  class="h-full bg-blue-600 transition-all duration-300"
                  style="width: {(progress.current / progress.total) * 100}%"
                ></div>
              </div>
              <div class="flex justify-between text-[10px] text-zinc-500 font-bold uppercase">
                <span>正在处理...</span>
                <span>{progress.current} / {progress.total}</span>
              </div>
              
              <div class="flex gap-2">
                <div class="flex-1 py-3 bg-zinc-800 text-zinc-400 rounded-xl font-bold flex items-center justify-center gap-2 text-sm">
                  <Loader2 class="w-4 h-4 animate-spin" />
                  转换中
                </div>
                <button
                  on:click={() => abortRequested = true}
                  disabled={abortRequested}
                  class="px-4 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-xl font-bold transition-all flex items-center gap-2 text-sm disabled:opacity-50"
                >
                  <XCircle class="w-4 h-4" />
                  中止
                </button>
              </div>
            </div>
          {:else}
            <button
              on:click={handleConvert}
              disabled={pendingFiles.length === 0}
              class="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white rounded-xl font-bold transition-all shadow-lg shadow-blue-900/20 flex items-center justify-center gap-3 active:scale-[0.98]"
            >
              <Download class="w-5 h-5" />
              开始转换任务
            </button>
          {/if}
        </div>
      </div>

      <!-- Status Footer -->
      {#if status !== 'idle'}
        <div
          class={"flex items-start gap-3 p-3 rounded-xl border text-xs animate-in slide-in-from-bottom-2 shrink-0 " + (status === 'success' ? 'bg-emerald-500/10 border-emerald-500/50 text-emerald-400' : status === 'error' ? 'bg-red-500/10 border-red-500/50 text-red-400' : 'bg-zinc-900 border-zinc-800 text-zinc-400')}
        >
          {#if status === 'success'}
            <CheckCircle2 class="w-4 h-4 shrink-0" />
          {:else if status === 'error'}
            <AlertCircle class="w-4 h-4 shrink-0" />
          {:else}
            <Loader2 class="w-4 h-4 shrink-0 animate-spin" />
          {/if}
          <div class="flex-1 overflow-hidden">
            <p class="font-bold truncate">{message}</p>
            {#if status === 'success' && completedFiles.length > 0}
              <button on:click={() => openFolder(completedFiles[0].path)} class="underline mt-0.5 opacity-70 hover:opacity-100">
                打开输出目录
              </button>
            {/if}
          </div>
        </div>
      {/if}
    </div>
  </div>
</main>

<style>
  :global(body) {
    margin: 0;
    overflow: hidden;
    user-select: none;
  }

  .custom-scrollbar::-webkit-scrollbar {
    width: 6px;
  }
  .custom-scrollbar::-webkit-scrollbar-track {
    background: transparent;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb {
    background: #27272a;
    border-radius: 10px;
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover {
    background: #3f3f46;
  }

  input[type="range"]::-webkit-slider-thumb {
    appearance: none;
    width: 12px;
    height: 12px;
    background: #3b82f6;
    border-radius: 50%;
    cursor: pointer;
  }

  .drag-region {
    -webkit-app-region: drag;
  }

  .no-drag {
    -webkit-app-region: no-drag;
  }
</style>
