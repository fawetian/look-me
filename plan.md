# 计划：Look-Me macOS 原生应用（SwiftUI）

## 背景

当前 Look-Me 是一个 Web 应用（React + MediaPipe + Recharts），通过摄像头监测眨眼频率，当眨眼率低于健康阈值时发出提醒。目标是用最新 SwiftUI 重新实现为 macOS 原生应用，使用 Apple Vision 框架进行人脸特征点检测。零外部依赖，完全原生。

## 分支

`feat/macos-swiftui-app`

## 项目结构

```
LookMe/
├── LookMe.xcodeproj/
├── LookMe/
│   ├── LookMeApp.swift              # @main 应用入口
│   ├── Info.plist                    # NSCameraUsageDescription
│   ├── Assets.xcassets/
│   ├── LookMe.entitlements          # App Sandbox + Camera
│   │
│   ├── Models/
│   │   ├── BlinkDetector.swift       # EAR 计算 + 眨眼状态机
│   │   ├── BlinkMonitor.swift        # @Observable 主协调器
│   │   └── Types.swift               # 枚举、结构体、常量
│   │
│   ├── Camera/
│   │   ├── CameraManager.swift       # AVCaptureSession 管理
│   │   └── CameraPreview.swift       # NSViewRepresentable 预览层
│   │
│   └── Views/
│       ├── ContentView.swift         # 主布局
│       ├── MetricsView.swift         # 实时指标显示
│       ├── BlinkChartView.swift      # Swift Charts 图表
│       └── AlertBannerView.swift     # 低眨眼率警报
```

## 技术方案

### Apple Vision 框架 EAR 计算

`VNFaceLandmarkRegion2D` 的 `leftEye`/`rightEye` 各有 8 个轮廓点：
- 水平距离：点 0（外眼角）↔ 点 4（内眼角）
- 垂直距离：点 1↔7、2↔6、3↔5（上下眼睑配对）
- EAR = 平均垂直距离 / 水平距离
- 阈值需实测校准（初始值可参考 Web 版 0.215/0.255，根据实际效果调整）

### 摄像头管线

```
AVCaptureSession（后台线程）
  → AVCaptureVideoDataOutput（CMSampleBuffer）
    → VNImageRequestHandler + VNDetectFaceLandmarksRequest
      → 提取眼部特征点 → 计算 EAR → 眨眼状态机
        → @MainActor 更新 @Observable BlinkMonitor → SwiftUI 自动刷新
```

### 目标平台

macOS 15+（Sequoia），Swift 6，`@Observable` 宏，Swift Charts

## 实现步骤

### 第 1 步：项目骨架
- 创建分支 `feat/macos-swiftui-app`
- 创建 Xcode 项目目录结构
- Info.plist（`NSCameraUsageDescription`）
- Entitlements（App Sandbox + Camera）
- LookMeApp.swift 入口

### 第 2 步：Types.swift — 类型与常量
- 枚举：`PermissionState`、`CameraState`、`FaceState`、`AlertState`
- 结构体：`BlinkHistoryPoint`、`MonitorMetrics`
- 常量：从 `src/constants.ts` 移植所有阈值

### 第 3 步：CameraManager.swift — 摄像头管理
- AVCaptureSession + AVCaptureVideoDataOutput
- 前置摄像头优先，回退到任意可用摄像头
- 权限请求、start/stop

### 第 4 步：CameraPreview.swift — 摄像头预览
- NSViewRepresentable 封装 AVCaptureVideoPreviewLayer

### 第 5 步：BlinkDetector.swift — 眨眼检测
- `calculateEAR(region: VNFaceLandmarkRegion2D) -> Double`
- `BlinkDetector` 状态机：closedStartedAt、lastBlinkAt
- `processEAR(_:timestamp:) -> Bool`

### 第 6 步：BlinkMonitor.swift — 主协调器
- `@Observable @MainActor class BlinkMonitor`
- 实现 AVCaptureVideoDataOutputSampleBufferDelegate
- VNDetectFaceLandmarksRequest 帧处理
- 60 秒滑动窗口、警报状态机、历史采样

### 第 7 步：SwiftUI 视图
- ContentView.swift — HStack 主布局（左预览 + 右指标）
- MetricsView.swift — 指标卡片网格 + 人脸状态徽章
- BlinkChartView.swift — Swift Charts 双轴折线图
- AlertBannerView.swift — 低眨眼率警报叠加层

## 验证

1. `xcodebuild build` 无编译错误
2. 运行应用 → 摄像头权限弹窗
3. 授权后显示实时预览 + 人脸检测
4. 眨眼 → 计数增加
5. 停止眨眼 20+ 秒 → 触发警报
6. 恢复眨眼 → 冷却 → 恢复正常
7. 图表每 10 秒更新

## 依赖

零外部依赖，仅 Apple 框架：SwiftUI、AVFoundation、Vision、Charts、Observation
