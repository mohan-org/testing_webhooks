this is for tesing only
aganin test
this is checking pull request

var http = require('http');

//create a server object:
http.createServer(function (req, res) {
  res.write('Hello World! this the game'); //write a response to the client
  res.end(); //end the response
}).listen(5000); //the server object listens on port 8080

import { tiAuthRedirectRoute } from "./ti-auth-redirect";

describe("/ti-redirect route", () => {
  const baseReq = {
    log: {
      error: jest.fn(),
    },
    db: {
      putTIAuth: jest.fn(),
    },
    ti: {
      exchangeCodeForToken: jest.fn(),
    },
  };

  const res: any = {
    redirect: jest.fn(),
  };

  const next = jest.fn();

  beforeEach(() => {
    jest.resetAllMocks();
  });

  describe("when success", () => {
    const req: any = {
      ...baseReq,
      query: {
        state: "zoom-id",
        code: "code",
      },
      config: {
        tiClientId: 'some-ti-collector-id',
        tiURL: 'https://ti.r.com'
      }
    };

    beforeEach(async () => {
      req.ti.exchangeCodeForToken.mockReturnValue("auth-token-info");
      await tiAuthRedirectRoute(req, res, next);
    });

    it("should exchangeCodeForToken", () => {
      expect(req.ti.exchangeCodeForToken).toHaveBeenCalledWith("code");
    });

    it("should save ti auth into db", () => {
      expect(req.db.putTIAuth).toHaveBeenCalledWith(
        "zoom-id",
        "auth-token-info",
      );
    });

    it("should redirect to success page", () => {
      expect(res.redirect).toHaveBeenCalledWith(
        'https://ti.r.com/collector/install/success?id=some-ti-collector-id'
      );
    });
  });

  describe("when no state query param", () => {
    const req: any = {
      ...baseReq,
      query: {
        code: "code",
      },
    };

    beforeEach(async () => {
      await tiAuthRedirectRoute(req, res, next);
    });

    it("should log error", () => {
      expect(req.log.error).toHaveBeenCalledWith(
        new Error("No state query param provided."),
      );
    });

    it("call next", () => {
      expect(next).toHaveBeenCalledWith(
        new Error("No state query param provided."),
      );
    });
  });

  describe("when no code query param", () => {
    const req: any = {
      ...baseReq,
      query: {
        state: "state",
      },
    };

    beforeEach(async () => {
      await tiAuthRedirectRoute(req, res, next);
    });

    it("should log error", () => {
      expect(req.log.error).toHaveBeenCalledWith(
        new Error("No code query param provided."),
      );
    });

    it("call next", () => {
      expect(next).toHaveBeenCalledWith(
        new Error("No code query param provided."),
      );
    });
  });

  describe("when exchange code for token error", () => {
    const req: any = {
      ...baseReq,
      query: {
        state: "state",
        code: "code",
      },
    };

    beforeEach(async () => {
      req.ti.exchangeCodeForToken.mockImplementation(() => {
        throw new Error("exchange code error");
      });
      await tiAuthRedirectRoute(req, res, next);
    });

    it("should log error", () => {
      expect(req.log.error).toHaveBeenCalledWith(
        new Error("exchange code error"),
      );
    });

    it("call next", () => {
      expect(next).toHaveBeenCalledWith(new Error("exchange code error"));
    });
  });

  describe("when db error", () => {
    const req: any = {
      ...baseReq,
      query: {
        state: "state",
        code: "code",
      },
    };

    beforeEach(async () => {
      req.db.putTIAuth.mockImplementation(() => {
        throw new Error("db error");
      });
      await tiAuthRedirectRoute(req, res, next);
    });

    it("should log error", () => {
      expect(req.log.error).toHaveBeenCalledWith(new Error("db error"));
    });

    it("call next", () => {
      expect(next).toHaveBeenCalledWith(new Error("db error"));
    });
  });
});
