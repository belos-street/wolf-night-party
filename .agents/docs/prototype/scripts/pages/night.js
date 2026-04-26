export const nightPages = {
  "night-wait": {
    title: "夜晚等待",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🌙 夜晚</h2>
          <p class="muted">当前不是你的行动阶段，请耐心等待。</p>
          <div class="card">
            <p class="muted">你的身份：平民</p>
          </div>
          <div class="nav-inline">
            <button class="btn btn-ghost" data-page="wolf">查看狼人页</button>
            <button class="btn btn-primary" data-page="seer">查看预言家页</button>
          </div>
        </div>
      </section>
    `,
  },

  wolf: {
    title: "狼人行动",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🐺 狼人请睁眼</h2>
          <p class="muted">你的同伴：李四</p>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三（存活）</button>
            <button class="target" data-select-target>王五（存活）</button>
            <button class="target" data-select-target>赵六（存活）</button>
            <button class="target" data-select-target>孙七（存活）</button>
          </div>
          <button class="btn btn-primary" data-page="seer">确认刀人</button>
        </div>
      </section>
    `,
  },

  seer: {
    title: "预言家行动",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">👁️ 预言家查验</h2>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target" data-select-target>李四</button>
            <button class="target" data-select-target>王五</button>
            <button class="target" data-select-target>赵六</button>
          </div>
          <p class="hint">示例结果：李四为狼人</p>
          <button class="btn btn-primary" data-page="guard">确认查验</button>
        </div>
      </section>
    `,
  },

  guard: {
    title: "守卫行动",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🛡️ 守卫守护</h2>
          <p class="hint">规则：不能连续两晚守同一人。</p>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target disabled" disabled>李四（上晚已守）</button>
            <button class="target" data-select-target>王五</button>
            <button class="target" data-select-target>赵六</button>
          </div>
          <button class="btn btn-primary" data-page="witch">确认守护</button>
        </div>
      </section>
    `,
  },

  witch: {
    title: "女巫行动",
    html: `
      <section class="screen">
        <div class="card stack">
          <h2 class="title">🧪 女巫用药</h2>
          <p class="muted">昨夜狼刀目标：李四</p>
          <div class="radio-list">
            <label><input type="radio" name="witch" checked /> 使用解药救李四</label>
            <label><input type="radio" name="witch" /> 使用毒药（选目标）</label>
            <label><input type="radio" name="witch" /> 不使用药水</label>
          </div>
          <div class="grid" data-select-group>
            <button class="target" data-select-target>张三</button>
            <button class="target" data-select-target>王五</button>
            <button class="target" data-select-target>赵六</button>
            <button class="target" data-select-target>孙七</button>
          </div>
          <button class="btn btn-primary" data-page="day-reveal">确认操作</button>
        </div>
      </section>
    `,
  },
};
