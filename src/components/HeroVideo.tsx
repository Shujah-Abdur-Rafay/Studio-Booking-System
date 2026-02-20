import { useState, useEffect, useRef } from 'react';
import { useStore } from '@/hooks/useStore';
import heroVideoData from '@/data/heroVideos.json';

export function HeroVideo() {
    const { carouselVideos, dataLoaded } = useStore();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [videos, setVideos] = useState<string[]>(Object.values(heroVideoData));
    const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);

    useEffect(() => {
        if (dataLoaded) {
            const activeVideos = carouselVideos
                .filter(v => v.isActive)
                .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
                .map(v => v.url);

            if (activeVideos.length > 0) {
                setVideos(activeVideos);
            } else {
                setVideos(Object.values(heroVideoData));
            }
        }
    }, [carouselVideos, dataLoaded]);

    useEffect(() => {
        const currentVideo = videoRefs.current[currentIndex];
        if (currentVideo) {
            currentVideo.currentTime = 0;
            currentVideo.play().catch(() => {});
        }

        videoRefs.current.forEach((video, index) => {
            if (index !== currentIndex && video) {
                video.pause();
                video.currentTime = 0;
            }
        });
    }, [currentIndex, videos]);

    const handleVideoEnded = () => {
        setCurrentIndex((prev) => (prev + 1) % videos.length);
    };

    return (
        <div className="absolute inset-0 w-full h-full overflow-hidden bg-black">
            {videos.map((src, index) => (
                <video
                    key={`${src}-${index}`}
                    ref={(el) => { videoRefs.current[index] = el; }}
                    src={src}
                    className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${index === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'}`}
                    muted
                    playsInline
                    preload="auto"
                    onEnded={index === currentIndex ? handleVideoEnded : undefined}
                />
            ))}
            <div className="absolute inset-0 bg-black/40 z-20" />
        </div>
    );
}