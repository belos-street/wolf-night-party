export const lobbyPages = {
  join: {
    title: "加入页面",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">加入游戏</h2>
          <p class="muted">输入昵称后进入等待大厅。</p>
          <input type="text" value="张三" maxlength="10" />
          <button class="btn btn-primary" data-page="lobby">加入游戏</button>
          <p class="hint">服务器: 192.168.43.1:3000</p>
        </div>
        <div class="card">
          <p class="muted">标准模式仅支持 6-12 人开局。</p>
        </div>
      </section>
    `,
  },

  lobby: {
    title: "等待大厅",
    html: `
      <section class="screen">
        <div class="card">
          <div class="row">
            <h2 class="title">当前玩家（7）</h2>
            <span class="chip">等待开始</span>
          </div>
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

        <div class="card stack">
          <h3 class="title">标准预设（7人局，只读）</h3>
          <p class="muted">狼人2 · 平民3 · 预言家1 · 女巫1</p>
          <p class="hint">人数变化时自动切换预设，主机不可手调。</p>
        </div>

        <button class="btn btn-primary" data-page="role">开始游戏</button>
      </section>
    `,
  },

  role: {
    title: "角色查看",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">你的身份</h2>
          <div class="card">
            <h3 class="title">👁️ 预言家</h3>
            <p class="muted">每晚可以查验一名玩家身份。</p>
          </div>
          <p class="hint">仅自己可见，主机也不能查看他人身份。</p>
          <button class="btn btn-primary" data-page="night-wait">我已知晓</button>
        </div>
      </section>
    `,
  },
};
