import { useState, useEffect } from "react";
import "./App.css";
import { placeOrder } from "./api/bithumb";
import toast, { Toaster } from "react-hot-toast";

type OrderType = "limit" | "market" | "price";

interface MarketData {
  market: string;
  korean_name: string;
  english_name: string;
}

// 로컬 마켓 데이터 (KRW 기반)
const LOCAL_MARKETS: MarketData[] = [
  { market: "KRW-BTC", korean_name: "비트코인", english_name: "Bitcoin" },
  { market: "KRW-ETH", korean_name: "이더리움", english_name: "Ethereum" },
  { market: "KRW-XRP", korean_name: "리플", english_name: "XRP" },
  {
    market: "KRW-BCH",
    korean_name: "비트코인캐시",
    english_name: "Bitcoin Cash",
  },
  { market: "KRW-LTC", korean_name: "라이트코인", english_name: "Litecoin" },
  { market: "KRW-EOS", korean_name: "이오스", english_name: "EOS" },
  { market: "KRW-TRX", korean_name: "트론", english_name: "TRON" },
  { market: "KRW-ADA", korean_name: "에이다", english_name: "Cardano" },
  { market: "KRW-SOL", korean_name: "솔라나", english_name: "Solana" },
  { market: "KRW-DOGE", korean_name: "도지", english_name: "Dogecoin" },
  { market: "KRW-LINK", korean_name: "체인링크", english_name: "Chainlink" },
  { market: "KRW-USDC", korean_name: "USD코인", english_name: "USD Coin" },
  { market: "KRW-USDT", korean_name: "테더", english_name: "Tether" },
  {
    market: "KRW-BNB",
    korean_name: "바이낸스 코인",
    english_name: "Binance Coin",
  },
  { market: "KRW-AVAX", korean_name: "아발란체", english_name: "Avalanche" },
  { market: "KRW-NEAR", korean_name: "니어", english_name: "NEAR" },
  { market: "KRW-ATOM", korean_name: "코스모스", english_name: "Cosmos" },
  { market: "KRW-MATIC", korean_name: "폴리곤", english_name: "Polygon" },
];

function App() {
  const [apiKey, setApiKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [market, setMarket] = useState("KRW-BTC");
  const [marketInputMode, setMarketInputMode] = useState<"select" | "custom">(
    "select"
  );
  const [customMarket, setCustomMarket] = useState("");
  const [side, setSide] = useState<"bid" | "ask">("bid");
  const [volume, setVolume] = useState("");
  const [price, setPrice] = useState("");
  const [ordType, setOrdType] = useState<OrderType>("limit");
  const [response, setResponse] = useState<unknown>(null);
  const [loading, setLoading] = useState(false);
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [krwMarkets, setKrwMarkets] = useState<MarketData[]>([]);
  const [marketsLoading, setMarketsLoading] = useState(true);
  const [ipv4, setIpv4] = useState<string>("로딩 중...");
  const [ipLoading, setIpLoading] = useState(true);

  // 마켓 데이터 초기화 (로컬 데이터 사용)
  useEffect(() => {
    try {
      setMarketsLoading(true);
      setMarkets(LOCAL_MARKETS);
      setKrwMarkets(LOCAL_MARKETS);
    } catch (error) {
      console.error("마켓 데이터 로드 실패:", error);
      setResponse({ error: "마켓 데이터를 불러올 수 없습니다." });
    } finally {
      setMarketsLoading(false);
    }
  }, []);

  // IPv4 정보 조회
  useEffect(() => {
    const fetchIPv4 = async () => {
      try {
        setIpLoading(true);
        // 공개 API를 사용하여 현재 IPv4 주소 조회
        const response = await fetch("https://api.ipify.org?format=json");
        const data = await response.json();
        setIpv4(data.ip || "알 수 없음");
      } catch (error) {
        console.error("IPv4 조회 실패:", error);
        setIpv4("조회 실패");
      } finally {
        setIpLoading(false);
      }
    };

    fetchIPv4();
  }, []);

  useEffect(() => {
    if (ordType === "market") {
      setSide("ask");
    } else if (ordType === "price") {
      setSide("bid");
    }
  }, [ordType]);

  const getMarketValue = () => {
    if (marketInputMode === "select") {
      return market;
    }
    return customMarket;
  };

  const handleMarketSelectChange = (
    e: React.ChangeEvent<HTMLSelectElement>
  ) => {
    const value = e.target.value;
    if (value === "custom") {
      setMarketInputMode("custom");
      setCustomMarket("");
    } else {
      setMarketInputMode("select");
      setMarket(value);
    }
  };

  const handleCustomMarketChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCustomMarket(e.target.value);
  };

  const handleOrder = async () => {
    // API 키 검증
    if (!apiKey || !secretKey) {
      const errorMsg = "API 키와 시크릿 키를 모두 입력해야 합니다.";
      setResponse({ error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // 마켓 검증
    const selectedMarket = getMarketValue();
    if (!selectedMarket) {
      const errorMsg = "마켓을 선택하거나 입력해야 합니다.";
      setResponse({ error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // 수량 검증
    if (!volume || parseFloat(volume) <= 0) {
      const errorMsg = "수량은 0보다 커야 합니다.";
      setResponse({ error: errorMsg });
      toast.error(errorMsg);
      return;
    }

    // 주문 종류별 가격 검증
    if (ordType === "limit") {
      if (!price || parseFloat(price) <= 0) {
        const errorMsg = "지정가 주문은 가격이 0보다 커야 합니다.";
        setResponse({ error: errorMsg });
        toast.error(errorMsg);
        return;
      }
    } else if (ordType === "price") {
      if (!price || parseFloat(price) <= 0) {
        const errorMsg = "시장가 매수는 주문 총액이 0보다 커야 합니다.";
        setResponse({ error: errorMsg });
        toast.error(errorMsg);
        return;
      }
    }

    setLoading(true);
    setResponse(null);

    try {
      const payload = {
        market: selectedMarket,
        side,
        volume,
        price,
        ord_type: ordType,
      };

      const result = await placeOrder(apiKey, secretKey, payload);
      setResponse(result);

      // 성공/실패 판단
      if (result.error) {
        toast.error(`주문 실패: ${result.error || "알 수 없는 오류"}`);
      } else if (result.uuid) {
        // 성공: uuid가 반환됨
        toast.success(`✓ 주문 성공! (ID: ${result.uuid.substring(0, 8)}...)`);
      } else {
        toast.success("✓ 주문이 처리되었습니다!");
      }
    } catch (error) {
      const errorMsg = `예상치 못한 오류가 발생했습니다. : ${error}`;
      setResponse({ error: errorMsg });
      toast.error(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  const getPriceLabel = () => {
    if (ordType === "price") return "주문 총액 (KRW)";
    return "가격";
  };

  return (
    <div className="min-h-screen p-8 font-sans">
      <Toaster
        position="top-right"
        reverseOrder={false}
        gutter={8}
        toastOptions={{
          duration: 4000,
          style: {
            background: "rgba(255, 255, 255, 0.15)",
            color: "#2c2c2c",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 200, 155, 0.3)",
            borderRadius: "12px",
            fontWeight: "500",
          },
          success: {
            duration: 3000,
            style: {
              background: "rgba(76, 175, 80, 0.15)",
              border: "1px solid rgba(76, 175, 80, 0.4)",
            },
            iconTheme: {
              primary: "#4caf50",
              secondary: "rgba(255, 255, 255, 0.8)",
            },
          },
          error: {
            duration: 4000,
            style: {
              background: "rgba(244, 67, 54, 0.15)",
              border: "1px solid rgba(244, 67, 54, 0.4)",
            },
            iconTheme: {
              primary: "#f44336",
              secondary: "rgba(255, 255, 255, 0.8)",
            },
          },
        }}
      />
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <h1 className="gradient-title text-center flex-1">
            빗썸 API 코인 주문
          </h1>
          <a
            href="https://github.com/goosebbeoms"
            target="_blank"
            rel="noopener noreferrer"
            className="github-btn"
            title="GitHub 프로필 방문"
          >
            <span>
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
              </svg>
            </span>
          </a>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          {/* API Keys Section */}
          <div className="flex flex-col gap-8">
            <div className="glass-card">
              <div className="flex items-center justify-between mb-4">
                <h2 className="section-heading mb-0">API 인증 정보</h2>
                <a
                  href="https://www.bithumb.com/react/api-support/management-api"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="api-management-btn"
                >
                  <span>🔑</span>
                  <span>API 관리</span>
                </a>
              </div>
              <div className="space-y-5">
                <div>
                  <label className="glass-label">API 키</label>
                  <input
                    type="text"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    className="w-full glass-input"
                    placeholder="API 키를 입력하세요"
                  />
                </div>
                <div>
                  <label className="glass-label">시크릿 키</label>
                  <input
                    type="password"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    className="w-full glass-input"
                    placeholder="시크릿 키를 입력하세요"
                  />
                </div>
              </div>
            </div>

            {/* IPv4 Info Section */}
            <div className="glass-card">
              <h2 className="section-heading">현재 환경 정보</h2>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="glass-label mb-0">현재 IPv4 주소</span>
                  {ipLoading ? (
                    <span className="text-sm text-gray-500">조회 중...</span>
                  ) : (
                    <span className="text-sm font-mono bg-gradient-to-r from-orange-400 to-orange-500 bg-clip-text text-transparent font-bold">
                      {ipv4}
                    </span>
                  )}
                </div>
                <div className="text-xs text-gray-600 mt-3">
                  빗썸 API 호출 시 등록된 IP 주소에서만 요청 가능합니다.
                </div>
              </div>
            </div>
          </div>

          {/* Order Form Section */}
          <div className="glass-card">
            <h2 className="section-heading">주문 실행</h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="glass-label">마켓 선택</label>
                {marketsLoading ? (
                  <div className="glass-select w-full text-center py-3 text-gray-500">
                    마켓 데이터 로딩 중...
                  </div>
                ) : (
                  <select
                    value={marketInputMode === "select" ? market : "custom"}
                    onChange={handleMarketSelectChange}
                    className="w-full glass-select"
                  >
                    <option value="">마켓을 선택하세요</option>
                    <optgroup label={`KRW 마켓 (${krwMarkets.length}개)`}>
                      {krwMarkets.map((marketData) => (
                        <option
                          key={marketData.market}
                          value={marketData.market}
                        >
                          {marketData.market} - {marketData.korean_name}
                        </option>
                      ))}
                    </optgroup>
                    <option value="custom">기타 (직접 입력)</option>
                  </select>
                )}
              </div>
              {marketInputMode === "custom" && (
                <div className="col-span-2">
                  <label className="glass-label">
                    마켓 코드 입력 (예: KRW-SOL)
                  </label>
                  <input
                    type="text"
                    value={customMarket}
                    onChange={handleCustomMarketChange}
                    className="w-full glass-input"
                    placeholder="예: KRW-USDT"
                  />
                  {customMarket && markets.length > 0 && (
                    <div className="mt-2 text-sm text-gray-600">
                      {markets.find(
                        (m) =>
                          m.market.toUpperCase() === customMarket.toUpperCase()
                      )
                        ? "✓ 존재하는 마켓입니다"
                        : "⚠ 존재하지 않는 마켓일 수 있습니다"}
                    </div>
                  )}
                </div>
              )}
              <div>
                <label className="glass-label">주문 종류</label>
                <select
                  value={ordType}
                  onChange={(e) => setOrdType(e.target.value as OrderType)}
                  className="w-full glass-select"
                >
                  <option value="limit">지정가</option>
                  <option value="market">시장가 매도</option>
                  <option value="price">시장가 매수</option>
                </select>
              </div>
              <div>
                <label className="glass-label">주문 유형</label>
                <select
                  value={side}
                  onChange={(e) => setSide(e.target.value as "bid" | "ask")}
                  className="w-full glass-select"
                  disabled={ordType !== "limit"}
                >
                  <option value="bid">매수</option>
                  <option value="ask">매도</option>
                </select>
              </div>
              <div>
                <label className="glass-label">수량</label>
                <input
                  type="number"
                  value={volume}
                  onChange={(e) => setVolume(e.target.value)}
                  className="w-full glass-input"
                  placeholder="0.00"
                />
              </div>
              <div className="col-span-2">
                <label className="glass-label">{getPriceLabel()}</label>
                <input
                  type="number"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full glass-input"
                  placeholder="0"
                  disabled={ordType === "market"}
                />
              </div>
            </div>
            <button
              onClick={handleOrder}
              className="w-full mt-6 glass-button"
              disabled={loading}
            >
              {loading ? "로딩 중..." : "주문 실행"}
            </button>
          </div>
        </div>

        {/* Response Section */}
        <div className="glass-card">
          <h2 className="section-heading">API 응답</h2>
          <div className="response-box">
            <pre>
              {JSON.stringify(response, null, 2) || "아직 응답이 없습니다..."}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
