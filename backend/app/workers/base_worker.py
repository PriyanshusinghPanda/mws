import asyncio
from abc import ABC, abstractmethod


class BaseWorker(ABC):
    """base class for all background workers"""

    def __init__(self, name: str):
        self.name = name
        self._running = False

    @abstractmethod
    async def process(self):
        """override this — the main work that happens each cycle"""
        pass

    async def start(self):
        self._running = True
        print(f"{self.name} started")
        while self._running:
            try:
                await self.process()
            except Exception as e:
                print(f"{self.name} error: {e}")
                await asyncio.sleep(1)

    def stop(self):
        self._running = False
        print(f"{self.name} stopping...")
