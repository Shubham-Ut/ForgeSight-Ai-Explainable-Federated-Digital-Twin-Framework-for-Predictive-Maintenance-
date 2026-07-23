declare const _default: {
    content: string[];
    darkMode: "class";
    theme: {
        extend: {
            colors: {
                primary: {
                    50: string;
                    100: string;
                    400: string;
                    500: string;
                    600: string;
                    700: string;
                    900: string;
                };
                surface: {
                    50: string;
                    100: string;
                    700: string;
                    800: string;
                    900: string;
                    950: string;
                };
                accent: {
                    cyan: string;
                    emerald: string;
                    amber: string;
                    rose: string;
                    violet: string;
                };
            };
            fontFamily: {
                sans: [string, string, string];
                mono: [string, string, string];
                display: [string, string];
            };
            animation: {
                'spin-slow': string;
                'pulse-slow': string;
                glow: string;
                'slide-in': string;
                'fade-in': string;
            };
            keyframes: {
                glow: {
                    from: {
                        boxShadow: string;
                    };
                    to: {
                        boxShadow: string;
                    };
                };
                slideIn: {
                    from: {
                        transform: string;
                        opacity: string;
                    };
                    to: {
                        transform: string;
                        opacity: string;
                    };
                };
                fadeIn: {
                    from: {
                        opacity: string;
                        transform: string;
                    };
                    to: {
                        opacity: string;
                        transform: string;
                    };
                };
            };
            spacing: {
                '18': string;
                '88': string;
            };
        };
    };
    plugins: any[];
};
export default _default;
