export const systemPages = {
  end: {
    title: "游戏结束",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🎉 游戏结束</h2>
          <p class="muted">好人阵营胜利！</p>
          <div class="card stack">
            <p>张三：🐺 狼人</p>
            <p>李四：🐺 狼人</p>
            <p>王五：👁️ 预言家</p>
            <p>赵六：🧪 女巫</p>
            <p>孙七：🔫 猎人</p>
            <p>周八：👤 平民</p>
          </div>
          <button class="btn btn-primary" data-page="lobby">再来一局</button>
        </div>
      </section>
    `,
  },

  disconnect: {
    title: "断线页面",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">⚠️ 连接中断</h2>
          <p class="muted">正在尝试重连... 倒计时 01:45</p>
          <p class="hint">倒计时结束仍未重连将判定死亡。</p>
          <button class="btn btn-primary" data-page="lobby">立即重连（原型）</button>
        </div>
      </section>
    `,
  },

  nojoin: {
    title: "无法加入",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">游戏进行中</h2>
          <p class="muted">当前局已开始，无法加入。</p>
          <p class="hint">请等待本局结束，或主机回到等待阶段。</p>
          <button class="btn btn-ghost" data-page="join">返回加入页</button>
        </div>
      </section>
    `,
  },

  timeout: {
    title: "操作超时",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">⏳ 操作超时</h2>
          <p class="muted">你未在时间内完成操作。</p>
          <p class="hint">系统已按默认策略继续流程。</p>
          <button class="btn btn-primary" data-page="night-wait">返回流程</button>
        </div>
      </section>
    `,
  },
};
