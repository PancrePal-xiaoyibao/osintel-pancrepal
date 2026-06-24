import React, { useState } from 'react';
import { WatchdogStatus } from '../types';
import { 
  Activity, 
  Cpu, 
  Terminal, 
  ShieldCheck, 
  Wrench, 
  Database, 
  Clock, 
  RotateCcw, 
  CheckCircle,
  Sliders
} from 'lucide-react';

interface WatchdogConsoleProps {
  status: WatchdogStatus;
  isRepairing: boolean;
  onTriggerRepair: () => Promise<string>;
  onTriggerRollback: () => Promise<string>;
}

export default function WatchdogConsoleView({ 
  status, 
  isRepairing, 
  onTriggerRepair, 
  onTriggerRollback 
}: WatchdogConsoleProps) {
  const [consoleLogs, setConsoleLogs] = useState<string[]>([
    'Initializing autonomic core daemon...',
    'Node active: checking proxies and API health quotas...',
    'System status: ONLINE, scanning database tables...'
  ]);
  const [successActionText, setSuccessActionText] = useState<string | null>(null);

  const addLog = (msg: string) => {
    const timestamp = new Date().toLocaleTimeString('zh-CN', { hour12: false });
    setConsoleLogs(prev => [`[${timestamp}] ${msg}`, ...prev.slice(0, 15)]);
  };

  const handleRepair = async () => {
    addLog('Executing Watchdog comprehensive diagnostics sequence...');
    try {
      const choice = await onTriggerRepair();
      addLog(`Watchdog self-healing complete. System patched: "${choice}"`);
      setSuccessActionText(` Watchdog 成功触发自检并修复！已自动化对齐变动的CSS选择位点，修复行为："${choice}"`);
      setTimeout(() => setSuccessActionText(null), 6000);
    } catch (err) {
      addLog('Self-healing diagnostic sequence reported an interface timeout.');
    }
  };

  const handleRollback = async () => {
    addLog('Initiating software rollback sequence...');
    try {
      const choice = await onTriggerRollback();
      addLog(`Rollback complete. Active partition reverted safely to commit tag: "${choice}"`);
      setSuccessActionText(`系统检测到编译分流预警。已全自动化回滚核心数据库与爬行注册表至上一次稳定分支版本 "v1.4.2-stable"！`);
      setTimeout(() => setSuccessActionText(null), 6000);
    } catch (err) {
      addLog('Software rollback sequence failed due to disk write constraints.');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">

      {/* Success alert */}
      {successActionText && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold rounded-xl flex items-center gap-3 animate-fade-in glass">
          <CheckCircle className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>{successActionText}</span>
        </div>
      )}

      {/* Dashboard Top Stat Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pb-2">
        
        {/* Core Status Block */}
        <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-5 flex items-center justify-between col-span-1 glass">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">自治生命体状态</span>
            <span className="text-base sm:text-lg font-serif font-semibold text-white flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
              </span>
              {status.status === 'healthy' ? '卓越自愈运行' : '防线降级中'}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono block mt-1">守护进程: System Watchdog v1.5</span>
          </div>
          <ShieldCheck className="h-10 w-10 text-emerald-500/10 shrink-0" />
        </div>

        {/* Uptime Block */}
        <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-5 flex items-center justify-between col-span-1 glass">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">独立运行天数 Uptime</span>
            <span className="text-base sm:text-lg font-serif font-semibold text-white font-mono">
              {status.uptime}
            </span>
            <span className="text-[10px] text-zinc-500 block">连续零宕机时间统计</span>
          </div>
          <Clock className="h-10 w-10 text-blue-500/10 shrink-0" />
        </div>

        {/* API Quota block */}
        <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-5 flex items-center justify-between col-span-1 glass">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">Gemini API Quota 额度</span>
            <span className="text-base sm:text-lg font-serif font-semibold text-white font-mono">
              {status.apiQuotaUsed} <span className="text-xs text-zinc-500 font-normal">/ {status.apiQuotaTotal} 次</span>
            </span>
            <span className="text-[10px] text-zinc-500 block">
              使用率: {((status.apiQuotaUsed / status.apiQuotaTotal) * 100).toFixed(1)}% (健康)
            </span>
          </div>
          <Database className="h-10 w-10 text-indigo-500/10 shrink-0" />
        </div>

        {/* Uptime / Resource usage block */}
        <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-5 flex items-center justify-between col-span-1 glass">
          <div className="space-y-1">
            <span className="text-[10px] text-zinc-400 font-semibold uppercase tracking-wider block font-sans">系统实时负荷</span>
            <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5 font-mono">
              <Cpu className="h-4 w-4 text-emerald-500" />
              CPU: {status.cpuLoad.toFixed(1)}% 
            </span>
            <span className="text-xs text-zinc-350 mt-1 font-mono block">
              MEM: {status.memoryUsage}
            </span>
          </div>
          <Activity className="h-10 w-10 text-amber-500/10 shrink-0" />
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Automated Scraper Nodes Console */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-zinc-950/50 border border-white/10 rounded-xl p-5 space-y-4 glass">
            <h3 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2 font-serif">
              <Sliders className="h-4 w-4 text-blue-400" />
              全球底层情报采集探针活性 (Ingestion Probe Matrix)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { name: 'ClinicalTrials.gov', type: 'US Feed', interval: '5分钟/次', speed: '120ms', status: 'ONLINE' },
                { name: 'PubMed / Semantic Scholar API', type: 'Paper Feed', interval: '10分钟/次', speed: '240ms', status: 'ONLINE' },
                { name: 'jRCT (日本临床注册)', type: 'Region Feed', interval: '30分钟/次', speed: '380ms', status: 'ONLINE' },
                { name: 'EU Clinical Trials', type: 'Sponsor Feed', interval: '30分钟/次', speed: '420ms', status: 'ONLINE' },
                { name: 'FDA Press Daily Parser', type: 'Policy Feed', interval: '12h/次', speed: '85ms', status: 'ONLINE' },
                { name: 'ASCO/ESMO Portal Ingestor', type: 'Symposium', interval: '24h/次', speed: '190ms', status: 'ONLINE' }
              ].map((probe, idx) => (
                <div key={idx} className="bg-black/60 border border-white/5 p-4 rounded-lg flex flex-col justify-between space-y-2 font-sans">
                  <div className="flex justify-between items-start">
                    <span className="text-xs font-semibold text-zinc-200 block truncate">{probe.name}</span>
                    <span className="text-[9px] bg-emerald-500/10 text-emerald-400 font-bold px-1.5 py-0.5 rounded border border-emerald-500/20 leading-none">
                      {probe.status}
                    </span>
                  </div>
                  <div className="text-[10px] text-zinc-400 space-y-1 font-mono leading-tight">
                    <p>类型：{probe.type}</p>
                    <p>周程：{probe.interval}</p>
                    <p>平均耗时：{probe.speed}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Self-Healing Manual Test Blocks */}
            <div className="border-t border-white/15 pt-5 space-y-4">
              <strong className="text-xs text-zinc-300 font-semibold block uppercase tracking-wider font-serif text-blue-400">
                人为压力干扰与自适应性自愈验证 (Test Bench Triggers)
              </strong>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-black p-4 rounded-lg border border-white/5 space-y-3 font-sans">
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    <strong>1. 触发 AI 网页选择器对齐与降级自愈</strong>：模拟在PubMed官网突然重构、CSS布局改变造成采集器超时阻塞时，调用Gemini自主理解HTML并在安全沙箱中秒级修复XPath。
                  </p>
                  <button
                    onClick={handleRepair}
                    disabled={isRepairing}
                    className="py-1.5 px-3 bg-blue-600 hover:bg-blue-500 disabled:bg-zinc-800 text-xs font-semibold text-white rounded flex items-center gap-1.5 cursor-pointer transition duration-150 active-glow font-sans"
                  >
                    <Wrench className="h-3.5 w-3.5 text-blue-200" />
                    {isRepairing ? '诊断及自愈中...' : '模拟自愈诊断 (Self-Heal)'}
                  </button>
                </div>

                <div className="bg-black p-4 rounded-lg border border-white/5 space-y-3 font-sans">
                  <p className="text-[11px] text-zinc-400 leading-normal">
                    <strong>2. 触发软件版本和注册表一键安全回滚</strong>：模拟线上遇到灾难性采集源反爬、API额度瞬时耗尽，系统自动在0.1秒内原子级切换路由机制，安全下沉回滚代码至上一高可靠分支。
                  </p>
                  <button
                    onClick={handleRollback}
                    className="py-1.5 px-3 bg-rose-500/10 text-rose-300 border border-rose-500/20 hover:bg-rose-500/20 text-xs font-semibold rounded flex items-center gap-1.5 cursor-pointer transition duration-150 font-sans"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-rose-300" />
                    模拟节点一键回滚 (Safe Rollback)
                  </button>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Live Terminal Log Streams */}
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-zinc-950/60 border border-white/10 rounded-xl p-5 h-full flex flex-col min-h-[350px] glass">
            <h4 className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5 border-b border-white/10 pb-3 font-serif">
              <Terminal className="h-4 w-4 text-emerald-400" />
              Watchdog 现场控制台 & 自编译流 (Live CLI)
            </h4>

            {/* Interactive Terminal Stream */}
            <div className="flex-1 overflow-y-auto mt-3 space-y-2.5 font-mono text-[10px] sm:text-[11px] leading-relaxed text-emerald-400 p-3 bg-black border border-white/5 rounded-lg">
              {consoleLogs.map((log, index) => (
                <div key={index} className="whitespace-pre-wrap">
                  <span className="text-zinc-600 mr-1.5">❯</span>
                  {log}
                </div>
              ))}
              <div className="flex items-center gap-1 text-zinc-650 animate-pulse">
                <span>❯</span>
                <span className="h-2.5 w-1 bg-emerald-400 inline-block"></span>
              </div>
            </div>

            {/* Simulated report telemetry */}
            <div className="border-t border-white/5 pt-3 mt-3 space-y-1.5 text-zinc-500 font-mono text-[10px]">
              <div className="flex justify-between">
                <span>自愈防线启动周期：</span>
                <span className="text-zinc-450">5 Mins / Loop</span>
              </div>
              <div className="flex justify-between">
                <span>当前激活修复决策树：</span>
                <span className="text-zinc-450">Tree Level II (AI Agentic)</span>
              </div>
              <div className="flex justify-between">
                <span>防断重度备份集群数：</span>
                <span className="text-emerald-500 font-bold">4/4 Nodes Active</span>
              </div>
            </div>
            
          </div>
        </div>

      </div>

      {/* Historic classified errors list (Simulating the 15-day failures and automatic mitigations) */}
      <div className="bg-zinc-950/45 border border-white/10 rounded-xl p-5 space-y-4 glass">
        <h4 className="text-sm font-semibold text-white uppercase tracking-wider font-serif">
          过去 15 天异常记录与智能对齐轨迹
        </h4>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs font-sans">
            <thead>
              <tr className="border-b border-white/10 text-zinc-400 font-medium">
                <th className="py-2.5 px-4 font-normal">故障时间</th>
                <th className="py-2.5 px-4 font-normal">严重等级</th>
                <th className="py-2.5 px-4 font-normal text-blue-400">异常分类 (Classifier)</th>
                <th className="py-2.5 px-4 font-normal w-[50%]">自愈对齐对端响应方案 (Auto Mitchell Patch)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-medium text-zinc-350">
              {status.errorLog.map((log, i) => (
                <tr key={i} className="hover:bg-black/40 transition">
                  <td className="py-3 px-4 text-[10px] text-zinc-500 font-mono">
                    {new Date(log.time).toLocaleString('zh-CN', {month: '2-digit', day: '2-digit', hour: '2-digit', minute:'2-digit', second:'2-digit'})}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                      log.level === 'CRITICAL' || log.level === 'ERROR'
                        ? 'bg-rose-500/10 text-rose-400'
                        : log.level === 'WARNING'
                        ? 'bg-amber-500/10 text-amber-400'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}>
                      {log.level}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-blue-400 text-[11px]">
                    {log.classification}
                  </td>
                  <td className="py-3 px-4 text-zinc-400 leading-normal">
                    {log.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
