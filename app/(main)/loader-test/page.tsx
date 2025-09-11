const LoaderTestPage = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-8">
      <div className="flex justify-center">
        <object
          type="image/svg+xml"
          data="/AnimatedOpenChat.svg"
          width="200"
          height="200"
        >
          svg-animation
        </object>
      </div>
    </div>
  </div>
);

export default LoaderTestPage;
