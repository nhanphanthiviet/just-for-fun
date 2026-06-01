# ======================================================================
#  TRÁI TIM LÝ TUÂN (李峋)
#  python heart.py
# ======================================================================

import random
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from math import sin, cos, pi, log
from tkinter import Tk, Canvas


# ----------------------------------------------------------------------
# 1. Config — gom mọi tham số vào một chỗ, không dùng biến toàn cục
# ----------------------------------------------------------------------
@dataclass
class Config:
    width: int = 640                # chiều rộng cửa sổ (pixel)
    height: int = 640               # chiều cao cửa sổ (pixel)
    scale: float = 11.0             # hệ số phóng to hình cho vừa màn hình
    color: str = "#ff6b81"          # màu hạt (đỏ - "#ff2121")
    bg: str = "black"               # màu nền canvas

    frames: int = 20                # số khung hình dựng trước (chạy mượt)
    edge_particles: int = 2000      # số hạt rải quanh viền
    inner_particles: int = 4000     # số hạt khuếch tán sâu vào giữa
    frame_ms: int = 160             # thời gian giữa 2 khung (mili-giây)

    @property
    def center_x(self) -> float:    # tâm X (giữa màn hình)
        return self.width / 2

    @property
    def center_y(self) -> float:    # tâm Y (giữa màn hình)
        return self.height / 2


# ----------------------------------------------------------------------
# 2. Shape (TRỪU TƯỢNG) — khuôn chung cho mọi hình dạng
#    * Lớp con CHỈ cần cài đặt công thức viền `edge_point`.
#    * Các phép biến đổi khác chỉ phụ thuộc TÂM -> đặt sẵn ở đây dùng chung.
# ----------------------------------------------------------------------
class Shape(ABC):
    def __init__(self, cfg: Config):
        self.cfg = cfg

    @abstractmethod
    def edge_point(self, angle: float, scale: float | None = None) -> tuple[int, int]:
        """Trả về 1 điểm (x, y) trên VIỀN của hình ứng với góc 'angle'.
        Mỗi hình con (Heart, Circle, ...) tự cài đặt công thức riêng."""
        ...

    # --- các phép biến đổi DÙNG CHUNG cho mọi hình ------------------
    def diffuse_inward(self, x: float, y: float, beta: float = 0.15) -> tuple[float, float]:
        # Đẩy hạt từ viền hướng về tâm một đoạn ngẫu nhiên
        rx = -beta * log(random.random())   # log(random) dồn hạt về gần viền
        ry = -beta * log(random.random())
        dx = rx * (x - self.cfg.center_x)
        dy = ry * (y - self.cfg.center_y)
        return x - dx, y - dy

    def shrink(self, x: float, y: float, scale: float) -> tuple[float, float]:
        # Lực co/giãn cho QUẦNG SÁNG: càng xa tâm lực càng yếu.
        force = -1 / (((x - self.cfg.center_x) ** 2 + (y - self.cfg.center_y) ** 2) ** 0.6)
        dx = scale * force * (x - self.cfg.center_x)
        dy = scale * force * (y - self.cfg.center_y)
        return x - dx, y - dy

    def beat_offset(self, x: float, y: float, scale: float) -> tuple[float, float]:
        # Đẩy/kéo hạt theo lực hướng tâm + rung nhẹ
        force = 1 / (((x - self.cfg.center_x) ** 2 + (y - self.cfg.center_y) ** 2) ** 0.52)
        dx = scale * force * (x - self.cfg.center_x) + random.randint(-1, 1)
        dy = scale * force * (y - self.cfg.center_y) + random.randint(-1, 1)
        return x - dx, y - dy

    @staticmethod
    def pulse(step: float) -> float:
        # Đường cong nhịp đập: dao động lên-xuống theo thời gian.
        return 2 * (2 * sin(4 * step)) / (2 * pi)


# ----------------------------------------------------------------------
# 2a. Heart — kế thừa Shape, cài đặt công thức viền hình tim
# ----------------------------------------------------------------------
class Heart(Shape):
    def edge_point(self, angle: float, scale: float | None = None) -> tuple[int, int]:
        scale = self.cfg.scale if scale is None else scale
        x = 16 * (sin(angle) ** 3)
        y = -(13 * cos(angle) - 5 * cos(2 * angle) - 2 * cos(3 * angle) - cos(4 * angle))
        x = x * scale + self.cfg.center_x   # phóng to rồi dời về tâm
        y = y * scale + self.cfg.center_y
        return int(x), int(y)


# ----------------------------------------------------------------------
# 2b. Circle — ví dụ cho thấy abstraction hoạt động: chỉ cần đổi viền
# ----------------------------------------------------------------------
class Circle(Shape):
    def edge_point(self, angle: float, scale: float | None = None) -> tuple[int, int]:
        scale = self.cfg.scale if scale is None else scale
        x = 16 * cos(angle) * scale + self.cfg.center_x
        y = 16 * sin(angle) * scale + self.cfg.center_y
        return int(x), int(y)


# ----------------------------------------------------------------------
# 3. ParticleSet — sinh & giữ tập hạt nền (viền + khuếch tán), tạo 1 lần
# ----------------------------------------------------------------------
@dataclass
class ParticleSet:
    edge: set = field(default_factory=set)        # hạt nằm đúng trên viền
    halo: set = field(default_factory=set)        # hạt khuếch tán nhẹ ở viền
    inner: set = field(default_factory=set)       # hạt khuếch tán nhiều vào giữa

    @classmethod
    def build(cls, shape: Shape) -> "ParticleSet":
        cfg = shape.cfg
        ps = cls()
        for _ in range(cfg.edge_particles):           # rải hạt quanh viền
            angle = random.uniform(0, 2 * pi)
            ps.edge.add(shape.edge_point(angle))
        for x, y in list(ps.edge):                    # mỗi hạt viền tỏa thêm 3 -> dày viền
            for _ in range(3):
                ps.halo.add(shape.diffuse_inward(x, y, 0.05))
        pts = list(ps.edge)
        for _ in range(cfg.inner_particles):          # hạt khuếch tán sâu vào giữa
            x, y = random.choice(pts)
            ps.inner.add(shape.diffuse_inward(x, y, 0.17))
        return ps


# ----------------------------------------------------------------------
# 4. ParticleEffect — dựng trước các khung hình rồi phát lại cho mượt.
#    Nhận VÀO một `Shape` bất kỳ -> Heart, Circle, hay hình mới đều chạy.
# ----------------------------------------------------------------------
class ParticleEffect:
    def __init__(self, shape: Shape):
        self.shape = shape
        self.cfg = shape.cfg
        self.particles = ParticleSet.build(shape)
        self.frames: dict[int, list[tuple[int, int, int]]] = {}
        for k in range(self.cfg.frames):              # tính trước toàn bộ khung hình
            self.frames[k] = self._build_frame(k)

    def _build_frame(self, step: int) -> list[tuple[int, int, int]]:
        shape = self.shape
        phase = shape.pulse(step / 10 * pi)
        scale = 12 * phase                            # mức co/giãn của khung này
        radius = int(4 + 6 * (1 + phase))             # bán kính quầng sáng
        halo_count = int(3000 + 4000 * abs(phase ** 2))   # số hạt quầng sáng
        frame: list[tuple[int, int, int]] = []

        seen = set()                                  # QUẦNG SÁNG bay lả tả quanh hình
        for _ in range(halo_count):
            angle = random.uniform(0, 2 * pi)
            x, y = shape.edge_point(angle, scale=11.6)
            x, y = shape.shrink(x, y, radius)
            if (x, y) not in seen:
                seen.add((x, y))
                x += random.randint(-14, 14)          # rung mạnh -> lấp lánh như pháo hoa
                y += random.randint(-14, 14)
                frame.append((x, y, random.choice((1, 2, 2))))

        for x, y in self.particles.edge:              # hạt viền chính, đập theo nhịp
            x, y = shape.beat_offset(x, y, scale)
            frame.append((x, y, random.randint(1, 3)))
        for x, y in self.particles.halo:              # hạt khuếch tán viền
            x, y = shape.beat_offset(x, y, scale)
            frame.append((x, y, random.randint(1, 2)))
        for x, y in self.particles.inner:             # hạt khuếch tán giữa
            x, y = shape.beat_offset(x, y, scale)
            frame.append((x, y, random.randint(1, 2)))

        return frame

    def draw(self, canvas: Canvas, step: int) -> None:
        for x, y, size in self.frames[step % self.cfg.frames]:   # mỗi hạt là 1 ô vuông nhỏ
            canvas.create_rectangle(x, y, x + size, y + size, width=0, fill=self.cfg.color)

    def export_gif(self, path: str = "heart.gif") -> str:
        # Vẽ lại các khung đã tính sẵn bằng Pillow -> ghép thành GIF nhịp đập.
        # Chạy được mà KHÔNG cần mở cửa sổ tkinter.
        from PIL import Image, ImageDraw        # chỉ cần khi xuất GIF
        anh = []
        for k in range(self.cfg.frames):
            img = Image.new("RGB", (self.cfg.width, self.cfg.height), self.cfg.bg)
            but = ImageDraw.Draw(img)
            for x, y, size in self.frames[k]:
                but.rectangle([x, y, x + size, y + size], fill=self.cfg.color)
            anh.append(img)
        anh[0].save(
            path, save_all=True, append_images=anh[1:],
            duration=self.cfg.frame_ms, loop=0,     # loop=0 -> lặp vô hạn
        )
        return path


# ----------------------------------------------------------------------
# 5. App — cửa sổ tkinter + vòng lặp hoạt hình
# ----------------------------------------------------------------------
class App:
    def __init__(self, shape: Shape | None = None):
        self.shape = shape or Heart(Config())         # mặc định: trái tim
        self.cfg = self.shape.cfg
        self.effect = ParticleEffect(self.shape)
        self.window = Tk()
        self.window.title("Trái tim Lý Tuân ❤")
        self.canvas = Canvas(
            self.window, bg=self.cfg.bg,
            height=self.cfg.height, width=self.cfg.width,
        )
        self.canvas.pack()

    def _tick(self, step: int = 0) -> None:
        self.canvas.delete("all")                     # xóa khung cũ
        self.effect.draw(self.canvas, step)           # vẽ khung mới
        self.window.after(self.cfg.frame_ms, self._tick, step + 1)

    def run(self) -> None:
        self._tick()
        self.window.mainloop()                        # giữ cửa sổ mở


if __name__ == "__main__":
    import sys

    sys.stdout.reconfigure(encoding="utf-8")   # in tiếng Việt không lỗi trên Windows
    shape = Heart(Config())                # đổi sang Circle(Config()) để xem hình tròn
    if len(sys.argv) > 1 and sys.argv[1] == "gif":
        duong_dan = ParticleEffect(shape).export_gif()
        print(f"Đã xuất GIF nhịp đập: {duong_dan}")
    else:
        App(shape).run()                   # mặc định: mở cửa sổ tim đập
