# 🌐 地球组件 3D 数字化战术升级与设计文档
> —— 优化 `#holo-guidance-globe-svg` 从 2D 拟真投影升级至 R3F 军事级三维态势地球

本设计文档旨在将当前应用在 `ResourceMapView.tsx` 中的 **2D SVG 正交投影地球 (Orthographic SVG Globe)** 组件升级至具备军事级可观测、精细纹理着色与流畅交互的 **物理加速 3D 态势地球 (WebGL 3D Tactical Globe)**。

升级方案深度参考了全球冲突监测平台（War Monitor）的设计标准、`global_3js_prompt.md` 规范以及 `GlobeView-Cs194XJC.js` 的底物理渲染机制。

---

## 1. 核心技术对比与转变 (Architectural Shift)

| 维度 | 当前实现 (2D SVG Projection) | 优化实现 (3D WebGL R3F Globe) |
| :--- | :--- | :--- |
| **底层渲染** | 浏览器 2D SVG 绘制（`<circle>`、`<path>`、`<g>`） | 硬件加速 WebGL2 (`@react-three/fiber` / `three`) |
| **性能极限** | 陆地云点图与国界线（超过 500 个节点）在拖拽时卡顿，CPU 密集 | **GPU 顶点处理**，128x128 精度球体高帧率运行，无 DOM 拖拽死锁 |
| **着色特效** | 简单的径向渐变 SVG 填充 | **自定义顶点/片元着色器 (Shader)**，含亮度掩膜陆地判定与菲涅尔边缘大气发光 |
| **国界绘制** | 静态近似硬编码多边形，无法缩放显示 | **GeoJSON 线段矢量投影 (LineSegments)**，真高精度矢量国界高亮 |
| **地表标识 (Marker)** | SVG `<g>` 正交转换偏移，无法实现三维立体漂浮与虚影 | **3D 材质精灵图 (`THREE.Sprite`) & 画布纹理 (`CanvasTexture`)** |
| **互动能级** | 阻尼系数在 React 状态下由 requestAnimationFrame 维护，较为单薄 | 原生 **OrbitControls** 插值平滑过渡 + 摄像机 LERP 朝向坐标缩放锁定 |

---

## 2. 空间与视觉设计规范 (Visual Specification)

为了满足北极星和北约指挥中心（NATO Command Center）式的战术监视风格，本 3D 升级将严格执行下列视觉色彩结构：

### 2.1 整体调色板 (Tactical HUD Theme)
*   **深太空底色 (Background)**: 纯黑 `#000000` 附带分形噪波图层，噪声不透明度限制为 `0.06`。
*   **深海色泽 (Ocean Color)**: `rgb(5, 15, 20)` —— 隐秘而高级的冷灰色调。
*   **低海拔陆地 (Land Low)**: `rgb(40, 33, 23)` 呈现略带砂质的灰土色。
*   **高海拔陆地 (Land High)**: `rgb(71, 61, 46)` 饱满的黄褐风化沙色。
*   **大气发光层 (Atmosphere Glow)**: 柔和日光蓝 `#E8F4FF`，发光强度系数设定为 `0.18`。
*   **常规国界 (Default Border)**: 预设低对比浅灰 `#E0E0E0`，不透明度 `0.14`；选中区域由安全能级动态上色。

### 2.2 地学网格与背景恒星 (Stars & Grid)
*   **星空层 (Star Field)**: 生成 `800` 个随机程序点，置于离地球外壁 `12 ~ 28` 物理尺度的空间内，使用 `PointsMaterial` (大小限制 `0.016`, `opacity: 0.35`)。
*   **大气外层阻尼圆环**: 外辅 `radius: 1.008` 的发光体，使用 **Additive Blending (加法混合)** 模式进行高亮边缘羽化，完美展现具有弧度的昼夜交替轮廓线。

---

## 3. Shader 着色器核心伪代码 (Core Shader Blueprint)

通过自定义着色器，用一张经典的高清地球亮度图层充当掩膜，从而将海洋和陆地在像素级进行极速过滤，保留军事面板科技感，拒绝市售娱乐化配色。

```glsl
// Vertex Shader (顶点着色器 - 陆地边缘计算)
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;
uniform float uUvOffsetX;

void main() {
  vUv = vec2(uv.x + uUvOffsetX, uv.y);
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
```

```glsl
// Fragment Shader (片元着色器 - Luminance 掩膜过渡)
uniform sampler2D uEarthTexture;
uniform float uTime;
uniform float uBrightness;
varying vec2 vUv;
varying vec3 vNormal;
varying vec3 vWorldPosition;

// 经典菲涅尔光晕函数
float fresnel(vec3 normal, vec3 viewDir, float power) {
  return pow(1.0 - max(dot(normal, viewDir), 0.0), power);
}

void main() {
  vec4 earthColor = texture2D(uEarthTexture, vUv);
  // 使用灰度公式计算亮度值
  float luminance = dot(earthColor.rgb, vec3(0.299, 0.587, 0.114));

  // 通过 smoothstep 在 [0.08, 0.30] 阈值内对陆地边缘进行抗锯齿级阶梯平滑
  float isLand = smoothstep(0.08, 0.30, luminance);

  vec3 oceanColor = vec3(0.02, 0.06, 0.08); // 铁青冷深海
  vec3 landLow  = vec3(0.16, 0.13, 0.09);    // 低海拨干地
  vec3 landHigh = vec3(0.28, 0.24, 0.18);    // 高峰黄砂质
  vec3 landColor = mix(landLow, landHigh, luminance);

  vec3 surfaceColor = mix(oceanColor, landColor, isLand);

  // 引入大气边缘光
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnelTerm = fresnel(vNormal, viewDir, 4.2); // F_Power = 4.2
  vec3 rimGlow = vec3(0.91, 0.96, 1.0) * fresnelTerm * 0.18; // E#E8F4FF 乘强度 0.18

  gl_FragColor = vec4(surfaceColor + rimGlow, 1.0);
}
```

---

## 4. 标志点、热区合并与碰撞检测 (Marker & Clustering Engine)

在升级为 3D 后，原来的平面 SVG 地标将换成面向摄像机的 `Sprite`。

### 4.1 标注安全评级分类 (Severity Color Rule)
依据情报等级和临床匹配危险级（如术后并发症或胰腺突发危重），节点标志自动进行变色分类：
*   **严重级 (Severity >= 9)**: `rgb(255, 60, 50)` (高亮战区深红)
*   **中度级 (Severity >= 7)**: `rgb(245, 140, 40)` (警示橙)
*   **常规级 (Severity < 7)**: `rgb(240, 195, 60)` (战术黄)

### 4.2 屏幕坐标重叠热区化 (Screen-Space Clustering)
为了解决地图上如 *长三角/长三角临床中枢* 多个标注点在缩放或者俯视时叠在一起的干扰，在组件内跑一个低频定时器或通过 `useFrame` 频率（20帧一周期）降采样计算：
1.  计算全球标志物的三维空间坐标 `v3 = project(Marker)`
2.  投射到屏幕空间 `(screenX, screenY)`
3.  发现相距较近（在当前缩放比例下距离 `< 40px`）的事件群，自动折叠压缩并在中心点生出聚合精灵，显示格式 `HOTZONE - N`
4.  将该热区最大的严重能级提取为该聚合主图标。

---

## 5. 交互控制器与 LERP 锁定 (Camera & Controller Limits)

为保障工业操作的高稳定性，通过三维惯性设定与速度包限防止用户划动地球时失速飞出：

*   **平移** (Pan): `enablePan = false` (固定地圈视口中心)
*   **阻尼插值过渡** (Damping): `enableDamping = true`, `dampingFactor = 0.08` (操作具备优雅的重力缓冲感)
*   **旋转系数**:
    *   `rotateSpeed = 0.15` (桌面环境)
    *   `rotateSpeed = 0.22` (移动环境)
*   **焦距尺度范围**: `minDistance = 1.2`, `maxDistance = 4.0` (保障患者绝对无法穿透并看见地球背面背空)
*   **缓慢自转**: `autoRotate = true`, `autoRotateSpeed = 0.1` (未发生拖动拖拽行为时，保持 24 小时微平滑转速，呈现不间断战术监控形态)

---

## 6. 改动实施四步走蓝图 (Implementation Roadmap)

### **步骤 1： 基础依赖扩增**
```bash
# 在 package.json 加入 standard 依赖并实施安装
npm install three @react-three/fiber @react-three/drei --legacy-peer-deps
npm install @types/three -D
```

### **步骤 2： 建立 `GlobeView3D.tsx` 容器**
在 `/src/components/` 下新建一个纯粹的 `R3F` 渲染组件 `GlobeView3D.tsx`。
其内用 `<Canvas>` 元件承接，封装 `Stars`, `Atmosphere`, `LineSegments`（加载 GeoJSON 国界），并用 `<OrbitControls />` 进行阻尼绑定。

### **步骤 3： 引入 `D3 Centroid` 地理中心转换**
加载世界地图 GeoJson 文件解析出多边形，求得经纬度中枢，在患者切换左侧面板“上海中枢/巴尔的摩中心/海德堡中心”时迅速对 `OrbitControls` 执行 `lerp` 位移，实现纵览世界的极流畅科技运镜动画。

### **步骤 4： `ResourceMapView.tsx` 的无缝热插手**
移除 `ResourceMapView.tsx` 里的 `svg#holo-guidance-globe-svg` 以及静态数学函数 `projectOrthographic`（其由 WebGL 阶段在管线内部进行）。在原区域放置 `GlobeView3D.tsx` 容器，直接共享相同的激活状态（如 `activeCenter`、`selectedCountry`、`patientProfile`）。

---

### 🎨 战术视觉设计结论
通过本次全面换代，`holo-guidance-globe-svg` 将由一个传统的“平面计算偏角”图像升级至真正能够全方位展示医疗资源分布与患者病情对标的 **3D 全景战术电子地球仪**。其黑色调美学和严谨的 UI 与当前整个诊断平台优雅的高负压引流/多维度评分卡片格调浑然一体。
