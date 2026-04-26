export const dayPages = {
  "day-reveal": {
    title: "白天通报",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">☀️ 第 2 天 · 死亡通报</h2>
          <div class="card">
            <p class="muted">💀 李四（狼人刀杀）</p>
          </div>
          <p class="hint">女巫毒杀/猎人带走无遗言。</p>
          <div class="actions">
            <button class="btn btn-ghost" data-open-modal="modal-last-words">遗言提示</button>
            <button class="btn btn-primary" data-page="hunter">进入猎人阶段</button>
          </div>
        </div>

        <div class="modal" id="modal-last-words">
          <div class="modal-panel stack">
            <h3>🎤 遗言</h3>
            <p class="muted">请以下玩家发表遗言：李四、王五</p>
            <button class="btn btn-primary" data-close-modal="modal-last-words">遗言结束</button>
          </div>
        </div>
      </section>
    `,
  },

  hunter: {
    title: "猎人开枪",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🔫 猎人技能</h2>
          <p class="muted">你死于狼刀，可以带走一人。</p>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target" data-select-target>王五</button>
            <button class="target" data-select-target>赵六</button>
            <button class="target" data-select-target>孙七</button>
          </div>
          <button class="btn btn-primary" data-page="vote">确认开枪并进入投票</button>
        </div>
      </section>
    `,
  },

  vote: {
    title: "白天投票",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🗳️ 投票放逐</h2>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target" data-select-target>王五</button>
            <button class="target" data-select-target>赵六</button>
            <button class="target" data-select-target>孙七</button>
          </div>
          <button class="btn btn-ghost" data-page="tie-vote">演示平票重投</button>
          <button class="btn btn-primary" data-open-modal="modal-vote-result">提交投票</button>
        </div>

        <div class="modal" id="modal-vote-result">
          <div class="modal-panel stack">
            <h3>📊 投票结果</h3>
            <p class="muted">李四 3票，王五 2票，赵六 1票</p>
            <p class="muted">李四被放逐</p>
            <div class="nav-inline">
              <button class="btn btn-ghost" data-open-modal="modal-idiot-reveal">白痴翻牌</button>
              <button class="btn btn-primary" data-page="end">继续</button>
            </div>
            <button class="btn btn-ghost" data-close-modal="modal-vote-result">关闭</button>
          </div>
        </div>

        <div class="modal" id="modal-idiot-reveal">
          <div class="modal-panel stack">
            <h3>🤪 白痴翻牌</h3>
            <p class="muted">张三翻牌后继续存活，但失去投票权。</p>
            <button class="btn btn-primary" data-close-modal="modal-idiot-reveal">我知道了</button>
          </div>
        </div>
      </section>
    `,
  },

  "tie-vote": {
    title: "平票重投",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">⚖️ 平票重投</h2>
          <p class="muted">候选人：张三、李四</p>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target" data-select-target>李四</button>
          </div>
          <p class="hint">若第二轮仍平票，则无人被放逐，直接进入下一夜。</p>
          <button class="btn btn-primary" data-page="night-wait">重投完成</button>
        </div>
      </section>
    `,
  },
};
