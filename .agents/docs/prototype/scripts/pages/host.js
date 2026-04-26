export const hostPages = {
  host: {
    title: "主机面板",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🐺 主机控制面板</h2>
          <p class="muted">状态：等待开始</p>
          <p class="hint">标准模式仅支持 6-12 人，配置只读。</p>
        </div>

        <div class="card stack">
          <h3 class="title">当前预设（7人局）</h3>
          <p class="muted">狼人2 · 平民3 · 预言家1 · 女巫1</p>
          <p class="hint">人数变化时自动切换，主机不可手动调整。</p>
        </div>

        <div class="card stack">
          <h3 class="title">玩家列表</h3>
          <ul class="list">
            <li class="player-row"><span>👤 张三</span><span class="badge">主机</span></li>
            <li class="player-row"><span>👤 李四</span><span></span></li>
            <li class="player-row"><span>👤 王五</span><span></span></li>
            <li class="player-row"><span>👤 赵六</span><span></span></li>
            <li class="player-row"><span>👤 孙七</span><span></span></li>
            <li class="player-row"><span>👤 周八</span><span></span></li>
            <li class="player-row"><span>👤 吴九</span><span></span></li>
          </ul>
        </div>

        <button class="btn btn-primary" data-page="role">开始游戏</button>

        <div class="card stack">
          <h3 class="title">游戏进行中（展示态）</h3>
          <p class="muted">第 2 天 · 夜晚-狼人刀人</p>
          <p class="muted">存活 6 · 死亡 1（李四，狼人刀杀）</p>
          <button class="btn btn-danger" disabled>重新开始（对局中不可用）</button>
        </div>
      </section>
    `,
  },
};
